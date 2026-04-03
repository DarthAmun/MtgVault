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
    return db.decks.get(id) ?? null
  }

  // ── Card Management ───────────────────────────────────────────────────────

  async function addCardToDeck(
    deckId: string,
    card: DeckCard
  ): Promise<void> {
    const deck = await db.decks.get(deckId)
    if (!deck) return

    const existing = deck.cards.find(
      c => c.scryfallId === card.scryfallId && c.isSideboard === card.isSideboard
    )

    const cards = existing
      ? deck.cards.map(c =>
          c.scryfallId === card.scryfallId && c.isSideboard === card.isSideboard
            ? { ...c, quantity: c.quantity + card.quantity }
            : c
        )
      : [...deck.cards, card]

    await db.decks.update(deckId, {
      cards,
      colorIdentity: await computeColorIdentity(cards),
      updatedAt: new Date().toISOString(),
    })
  }

  async function removeCardFromDeck(
    deckId: string,
    scryfallId: string,
    isSideboard = false
  ): Promise<void> {
    const deck = await db.decks.get(deckId)
    if (!deck) return
    const cards = deck.cards.filter(
      c => !(c.scryfallId === scryfallId && c.isSideboard === isSideboard)
    )
    await db.decks.update(deckId, {
      cards,
      colorIdentity: await computeColorIdentity(cards),
      updatedAt: new Date().toISOString(),
    })
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

  // ── Import ────────────────────────────────────────────────────────────────

  interface ParsedDeckLine {
    quantity: number
    name: string
    set?: string
    collectorNumber?: string
    isSideboard: boolean
    isCommander: boolean
  }

  function parseDeckList(text: string): ParsedDeckLine[] {
    const lines = text.trim().split('\n')
    const results: ParsedDeckLine[] = []
    let inSideboard = false
    let inCommander = false

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) { inSideboard = false; continue }
      if (/^(sideboard|side)/i.test(line)) { inSideboard = true; continue }
      if (/^(commander|commanders)/i.test(line)) { inCommander = true; continue }
      if (/^(deck|maindeck|main)/i.test(line)) { inSideboard = false; inCommander = false; continue }

      const match = line.match(/^(\d+)x?\s+(.+?)(?:\s+\(([A-Z0-9]+)\)(?:\s+(\d+))?)?$/)
      if (!match) continue

      results.push({
        quantity: parseInt(match[1]),
        name: match[2].trim(),
        set: match[3]?.toLowerCase(),
        collectorNumber: match[4],
        isSideboard: inSideboard,
        isCommander: inCommander,
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

    // Fetch all scryfall data
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

    // Missing from collection
    const missingCards: DeckCard[] = []
    for (const dc of deck.cards) {
      const owned = await db.collection.where('scryfallId').equals(dc.scryfallId).toArray()
      const totalOwned = owned.reduce((s, e) => s + e.quantity + (e.foilQuantity ?? 0), 0)
      if (totalOwned < dc.quantity) missingCards.push(dc)
    }

    // Estimated value
    let estimatedValue = 0
    for (const dc of deck.cards) {
      const sc = cardMap.get(dc.scryfallId)
      if (!sc) continue
      const price = parseFloat(sc.prices?.usd ?? '0') || 0
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
    parseDeckList,
    getDeckStats,
  }
}
