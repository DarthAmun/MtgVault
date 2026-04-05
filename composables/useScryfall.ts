import type { ScryfallCard, ScryfallSet } from '~/types'
import { db, bulkUpsertScryfallCards } from '~/db'

const BULK_META = 'https://api.scryfall.com/bulk-data'

export function useScryfall() {
  // ── Single Card Lookups (local IndexedDB only) ───────────────────────────

  async function getCardById(id: string): Promise<ScryfallCard | null> {
    return (await db.scryfallCards.get(id)) ?? null
  }

  async function localGetCardByName(name: string, set?: string): Promise<ScryfallCard | null> {
    // If set given, try exact printing first
    if (set) {
      const inSet = await db.scryfallCards
        .where('set').equals(set.toLowerCase())
        .and(c => c.name.toLowerCase() === name.toLowerCase())
        .first()
      if (inSet) return inSet
    }

    // Fall back to any printing with matching name
    return (await db.scryfallCards.where('name').equalsIgnoreCase(name).first()) ?? null
  }

  async function localGetCardBySetAndNumber(set: string, collectorNumber: string): Promise<ScryfallCard | null> {
    return (await db.scryfallCards
      .where('set').equals(set.toLowerCase())
      .and(c => c.collector_number === collectorNumber)
      .first()) ?? null
  }

  async function getCardByName(name: string, set?: string): Promise<ScryfallCard | null> {
    return localGetCardByName(name, set)
  }

  async function getCardBySetAndNumber(set: string, collectorNumber: string): Promise<ScryfallCard | null> {
    return localGetCardBySetAndNumber(set, collectorNumber)
  }

  // ── Local full-text search across cached cards ───────────────────────────

  async function localSearch(query: string, limit = 50): Promise<ScryfallCard[]> {
    const q = query.toLowerCase().trim()
    if (!q) return []

    const byName = await db.scryfallCards
      .where('name')
      .startsWithIgnoreCase(q)
      .limit(limit)
      .toArray()

    if (byName.length >= limit) return byName

    const rest = await db.scryfallCards
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.type_line?.toLowerCase().includes(q) ||
        c.oracle_text?.toLowerCase().includes(q) ||
        c.set_name?.toLowerCase().includes(q)
      )
      .limit(limit)
      .toArray()

    const seen = new Set(byName.map(c => c.id))
    return [...byName, ...rest.filter(c => !seen.has(c.id))].slice(0, limit)
  }

  // ── Autocomplete (local only) ─────────────────────────────────────────────

  async function autocomplete(query: string): Promise<string[]> {
    if (query.length < 2) return []
    const local = await db.scryfallCards
      .where('name')
      .startsWithIgnoreCase(query)
      .limit(10)
      .toArray()
    return local.map(c => c.name)
  }

  async function autocompleteCards(query: string): Promise<ScryfallCard[]> {
    if (query.length < 2) return []
    return db.scryfallCards
      .where('name')
      .startsWithIgnoreCase(query)
      .limit(8)
      .toArray()
  }

  // ── Prints (local only) ───────────────────────────────────────────────────

  async function getPrints(oracleId: string): Promise<ScryfallCard[]> {
    return db.scryfallCards
      .where('oracle_id').equals(oracleId)
      .toArray()
  }

  // ── Sets (derived from local card data) ──────────────────────────────────

  async function getAllSets(): Promise<ScryfallSet[]> {
    // Build a unique set list from the cards we have stored
    const cards = await db.scryfallCards.toArray()
    const seen = new Map<string, ScryfallSet>()
    for (const c of cards) {
      if (c.set && !seen.has(c.set)) {
        seen.set(c.set, {
          code: c.set,
          name: c.set_name ?? c.set,
        } as ScryfallSet)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // ── Bulk Data Import (network — intentional, this is the preload step) ────

  interface BulkProgress {
    phase: 'fetching-meta' | 'downloading' | 'parsing' | 'storing' | 'done' | 'error'
    loaded: number
    total: number
    percent: number
    message: string
  }

  async function importBulkData(
    onProgress: (p: BulkProgress) => void
  ): Promise<void> {
    onProgress({ phase: 'fetching-meta', loaded: 0, total: 0, percent: 0, message: 'Fetching bulk data manifest…' })

    const metaRes = await fetch(BULK_META)
    const meta = await metaRes.json()
    const defaultCards = meta.data?.find((d: any) => d.type === 'default_cards')
    if (!defaultCards) throw new Error('Could not find default_cards bulk data')

    const downloadUrl: string = defaultCards.download_uri
    const expectedSize: number = defaultCards.size ?? 0

    onProgress({ phase: 'downloading', loaded: 0, total: expectedSize, percent: 0, message: 'Downloading card data (~100MB)…' })

    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error('Bulk download failed')

    const reader = res.body!.getReader()
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value as Uint8Array<ArrayBuffer>)
      loaded += value.length
      onProgress({
        phase: 'downloading',
        loaded,
        total: expectedSize,
        percent: expectedSize ? Math.round((loaded / expectedSize) * 100) : 0,
        message: `Downloading… ${(loaded / 1_000_000).toFixed(1)} MB`,
      })
    }

    onProgress({ phase: 'parsing', loaded, total: expectedSize, percent: 95, message: 'Parsing JSON…' })

    const blob = new Blob(chunks)
    const text = await blob.text()
    const cards: ScryfallCard[] = JSON.parse(text)

    onProgress({ phase: 'storing', loaded, total: expectedSize, percent: 97, message: `Storing ${cards.length.toLocaleString()} cards…` })

    await bulkUpsertScryfallCards(cards)
    await db.syncMeta.put({ key: 'bulk_last_updated', value: new Date().toISOString() })
    await db.syncMeta.put({ key: 'bulk_card_count', value: cards.length })

    onProgress({ phase: 'done', loaded, total: expectedSize, percent: 100, message: `Done! ${cards.length.toLocaleString()} cards imported.` })
  }

  async function getBulkMeta(): Promise<{ lastUpdated: string | null; cardCount: number }> {
    const [lastUpdated, cardCount] = await Promise.all([
      db.syncMeta.get('bulk_last_updated').then(r => r?.value as string ?? null),
      db.syncMeta.get('bulk_card_count').then(r => (r?.value as number) ?? 0),
    ])
    return { lastUpdated, cardCount }
  }

  return {
    getCardById,
    getCardByName,
    getCardBySetAndNumber,
    localGetCardByName,
    localGetCardBySetAndNumber,
    localSearch,
    autocomplete,
    autocompleteCards,
    importBulkData,
    getBulkMeta,
    getAllSets,
    getPrints,
  }
}
