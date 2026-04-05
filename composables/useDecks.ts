import { db } from '~/db'
import type { Deck, DeckCard, DeckStats, MtgColor, MtgFormat } from '~/types'

export function useDecks() {
  // ── CRUD ─────────────────────────────────────────────────────────────────

  async function createDeck(
    data: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    await db.decks.put({ ...data, id, createdAt: now, updatedAt: now })
    return id
  }

  async function updateDeck(id: string, changes: Partial<Deck>): Promise<void> {
    await db.decks.update(id, { ...changes, updatedAt: new Date().toISOString() })
  }

  async function deleteDeck(id: string): Promise<void> {
    await db.decks.delete(id)
    // Clean up deckId references from collection entries
    const entries = await db.collection.where('deckIds').equals(id).toArray()
    await Promise.all(
      entries.map(e =>
        db.collection.update(e.id, {
          deckIds: e.deckIds.filter(d => d !== id),
          updatedAt: new Date().toISOString(),
        })
      )
    )
  }

  async function getAll(): Promise<Deck[]> {
    return db.decks.orderBy('updatedAt').reverse().toArray()
  }

  async function getById(id: string): Promise<Deck | null> {
    return (await db.decks.get(id)) ?? null
  }

  // ── Card Management ───────────────────────────────────────────────────────

  /**
   * Find the best collection entry to link to this deck card.
   * Prefers exact scryfallId match; falls back to any printing via oracle_id.
   * Returns null if the card is not in the collection at all.
   */
  async function findCollectionEntry(scryfallId: string): Promise<string | null> {
    // Try exact printing first
    const exact = await db.collection.where('scryfallId').equals(scryfallId).first()
    if (exact) return exact.id

    // Try any printing via oracle_id
    const sc = await db.scryfallCards.get(scryfallId)
    if (sc?.oracle_id) {
      const allPrintings = await db.scryfallCards
        .where('oracle_id').equals(sc.oracle_id).toArray()
      for (const printing of allPrintings) {
        const entry = await db.collection.where('scryfallId').equals(printing.id).first()
        if (entry) return entry.id
      }
    }
    return null
  }

  async function addCardToDeck(
    deckId: string,
    card: DeckCard
  ): Promise<void> {
    const deck = await db.decks.get(deckId)
    if (!deck) return

    // Find collection entry to link
    const collectionEntryId = card.collectionEntryId ?? await findCollectionEntry(card.scryfallId)
    const notOwned = !collectionEntryId

    const enriched: DeckCard = {
      ...card,
      collectionEntryId: collectionEntryId ?? undefined,
      notOwned,
    }

    const existing = deck.cards.find(
      c => c.scryfallId === card.scryfallId && c.isSideboard === card.isSideboard
    )

    const cards = existing
      ? deck.cards.map(c =>
          c.scryfallId === card.scryfallId && c.isSideboard === card.isSideboard
            ? { ...c, quantity: c.quantity + card.quantity }
            : c
        )
      : [...deck.cards, enriched]

    await db.decks.update(deckId, {
      cards,
      colorIdentity: await computeColorIdentity(cards),
      updatedAt: new Date().toISOString(),
    })

    // Update collection entry's deckIds
    if (collectionEntryId && !existing) {
      const entry = await db.collection.get(collectionEntryId)
      if (entry && !entry.deckIds.includes(deckId)) {
        await db.collection.update(collectionEntryId, {
          deckIds: [...entry.deckIds, deckId],
          updatedAt: new Date().toISOString(),
        })
      }
    }
  }

  async function removeCardFromDeck(
    deckId: string,
    scryfallId: string,
    isSideboard = false
  ): Promise<void> {
    const deck = await db.decks.get(deckId)
    if (!deck) return

    const removing = deck.cards.find(
      c => c.scryfallId === scryfallId && c.isSideboard === isSideboard
    )

    const cards = deck.cards.filter(
      c => !(c.scryfallId === scryfallId && c.isSideboard === isSideboard)
    )
    await db.decks.update(deckId, {
      cards,
      colorIdentity: await computeColorIdentity(cards),
      updatedAt: new Date().toISOString(),
    })

    // Clean up collection entry deckIds if no other deck card references it
    if (removing?.collectionEntryId) {
      const stillLinked = cards.some(c => c.collectionEntryId === removing.collectionEntryId)
      if (!stillLinked) {
        const entry = await db.collection.get(removing.collectionEntryId)
        if (entry) {
          await db.collection.update(removing.collectionEntryId, {
            deckIds: entry.deckIds.filter(d => d !== deckId),
            updatedAt: new Date().toISOString(),
          })
        }
      }
    }
  }

  async function setCardQuantity(
    deckId: string,
    scryfallId: string,
    quantity: number,
    isSideboard = false
  ): Promise<void> {
    const deck = await db.decks.get(deckId)
    if (!deck) return
    const cards =
      quantity <= 0
        ? deck.cards.filter(c => !(c.scryfallId === scryfallId && c.isSideboard === isSideboard))
        : deck.cards.map(c =>
            c.scryfallId === scryfallId && c.isSideboard === isSideboard
              ? { ...c, quantity }
              : c
          )
    await db.decks.update(deckId, { cards, updatedAt: new Date().toISOString() })
  }

  async function setCommander(
    deckId: string,
    scryfallId: string,
    isCommander: boolean
  ): Promise<void> {
    const deck = await db.decks.get(deckId)
    if (!deck) return
    const cards = deck.cards.map(c =>
      c.scryfallId === scryfallId ? { ...c, isCommander } : c
    )
    await db.decks.update(deckId, { cards, updatedAt: new Date().toISOString() })
  }

  // ── Import ────────────────────────────────────────────────────────────────

  interface ParsedDeckLine {
    quantity: number
    name: string
    set?: string
    collectorNumber?: string
    isSideboard: boolean
    isCommander: boolean
    foil: boolean
  }

  function parseDeckList(text: string): ParsedDeckLine[] {
    const lines = text.trim().split('\n')
    const results: ParsedDeckLine[] = []
    let inSideboard = false
    let inCommander = false

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) { inSideboard = false; continue }

      // Section headers
      if (/^(sideboard|side\s*board)/i.test(line)) { inSideboard = true; continue }
      if (/^(commander|commanders)/i.test(line)) { inCommander = true; continue }
      if (/^(deck|maindeck|main)/i.test(line)) { inSideboard = false; inCommander = false; continue }
      if (/^\/\//.test(line)) continue // comment lines

      // Detect foil marker (*F* or *f*) anywhere in the line
      const foil = /\*[Ff]\*/.test(line)
      const cleanLine = line.replace(/\s*\*[Ff]\*/g, '').trim()

      // Detect SB: prefix for sideboard
      const sbPrefix = /^SB:\s*/i.test(cleanLine)
      const parseLine = sbPrefix ? cleanLine.replace(/^SB:\s*/i, '') : cleanLine
      if (sbPrefix) inSideboard = true

      // Format: [qty][x] Name [(SET)] [num]
      const match = parseLine.match(/^(\d+)[xX]?\s+(.+?)(?:\s+\(([A-Za-z0-9]+)\)(?:\s+(\S+))?)?$/)
      if (!match) continue

      results.push({
        quantity: parseInt(match[1]),
        name: match[2].trim(),
        set: match[3]?.toLowerCase(),
        collectorNumber: match[4],
        isSideboard: sbPrefix ? true : inSideboard,
        isCommander: inCommander,
        foil,
      })
      inCommander = false // only first line in commander section
    }

    return results
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async function getDeckStats(deckId: string): Promise<DeckStats | null> {
    const deck = await db.decks.get(deckId)
    if (!deck) return null

    const mainDeck = deck.cards.filter(c => !c.isSideboard)
    const cardCount = mainDeck.reduce((s, c) => s + c.quantity, 0)
    const uniqueCount = mainDeck.length

    const scryfallCards = await Promise.all(
      deck.cards.map(c => db.scryfallCards.get(c.scryfallId))
    )
    const cardMap = new Map(
      scryfallCards.filter(Boolean).map(c => [c!.id, c!])
    )

    // Mana curve
    const manaCurve: Record<number, number> = {}
    let totalCmc = 0
    let cmcCount = 0
    for (const dc of mainDeck) {
      const sc = cardMap.get(dc.scryfallId)
      if (!sc || sc.type_line?.includes('Land')) continue
      const cmc = sc.cmc ?? 0
      manaCurve[cmc] = (manaCurve[cmc] ?? 0) + dc.quantity
      totalCmc += cmc * dc.quantity
      cmcCount += dc.quantity
    }

    // Color distribution
    const colorDist: Partial<Record<MtgColor, number>> = {}
    for (const dc of mainDeck) {
      const sc = cardMap.get(dc.scryfallId)
      if (!sc) continue
      for (const color of sc.colors ?? []) {
        colorDist[color as MtgColor] = (colorDist[color as MtgColor] ?? 0) + dc.quantity
      }
    }

    // Type breakdown
    const typeBreakdown: Record<string, number> = {}
    for (const dc of mainDeck) {
      const sc = cardMap.get(dc.scryfallId)
      if (!sc) continue
      const mainType = sc.type_line?.split('—')[0]?.trim().split(' ').pop() ?? 'Unknown'
      typeBreakdown[mainType] = (typeBreakdown[mainType] ?? 0) + dc.quantity
    }

    // Missing from collection — match any printing of the same oracle card
    const missingCards: DeckCard[] = []
    for (const dc of deck.cards) {
      const sc = cardMap.get(dc.scryfallId)
      let totalOwned = 0

      if (sc?.oracle_id) {
        const allPrintings = await db.scryfallCards
          .where('oracle_id').equals(sc.oracle_id).toArray()
        const printingIds = allPrintings.map(p => p.id)
        const ownedEntries = await db.collection
          .filter(e => printingIds.includes(e.scryfallId))
          .toArray()
        totalOwned = ownedEntries.reduce((s, e) => s + e.quantity + (e.foilQuantity ?? 0), 0)
      } else {
        const ownedEntries = await db.collection.where('scryfallId').equals(dc.scryfallId).toArray()
        totalOwned = ownedEntries.reduce((s, e) => s + e.quantity + (e.foilQuantity ?? 0), 0)
      }

      if (totalOwned < dc.quantity) missingCards.push(dc)
    }

    // Estimated value — skip cards marked notOwned (proxied/missing) and look up proxy status
    let estimatedValue = 0
    for (const dc of deck.cards) {
      if (dc.notOwned) continue
      const sc = cardMap.get(dc.scryfallId)
      if (!sc) continue
      // Check if the linked collection entry is a proxy
      if (dc.collectionEntryId) {
        const entry = await db.collection.get(dc.collectionEntryId)
        if (entry?.isProxy) continue
      }
      const price = dc.foil
        ? parseFloat(sc.prices?.usd_foil ?? sc.prices?.usd ?? '0') || 0
        : parseFloat(sc.prices?.usd ?? '0') || 0
      estimatedValue += price * dc.quantity
    }

    return {
      cardCount,
      uniqueCount,
      avgManaValue: cmcCount > 0 ? totalCmc / cmcCount : 0,
      manaCurve,
      colorDistribution: colorDist as Record<MtgColor, number>,
      typeBreakdown,
      missingCards,
      proxiedCards: [],
      estimatedValue,
      legalIn: [],
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function computeColorIdentity(cards: DeckCard[]): Promise<MtgColor[]> {
    const colors = new Set<MtgColor>()
    for (const dc of cards) {
      const sc = await db.scryfallCards.get(dc.scryfallId)
      if (sc) sc.color_identity?.forEach(c => colors.add(c as MtgColor))
    }
    return Array.from(colors)
  }

  return {
    createDeck,
    updateDeck,
    deleteDeck,
    getAll,
    getById,
    addCardToDeck,
    removeCardFromDeck,
    setCardQuantity,
    setCommander,
    parseDeckList,
    getDeckStats,
  }
}
