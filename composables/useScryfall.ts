import type { ScryfallCard, ScryfallSet } from '~/types'
import { db, bulkUpsertScryfallCards } from '~/db'

const BASE = 'https://api.scryfall.com'
const BULK_META = 'https://api.scryfall.com/bulk-data'

// Rate-limit: Scryfall asks for max 10 req/s — we stay safe at 80ms between calls
let lastRequest = 0
async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now()
  const gap = now - lastRequest
  if (gap < 80) await new Promise(r => setTimeout(r, 80 - gap))
  lastRequest = Date.now()
  return fetch(url)
}

export function useScryfall() {
  // ── Single Card Lookups ──────────────────────────────────────────────────

  async function getCardById(id: string): Promise<ScryfallCard | null> {
    // Check DB first
    const cached = await db.scryfallCards.get(id)
    if (cached) return cached

    try {
      const res = await throttledFetch(`${BASE}/cards/${id}`)
      if (!res.ok) return null
      const card: ScryfallCard = await res.json()
      await db.scryfallCards.put(card)
      return card
    } catch {
      return null
    }
  }

  async function getCardByName(name: string, set?: string): Promise<ScryfallCard | null> {
    // Try local DB first (exact then fuzzy)
    const exact = await db.scryfallCards.where('name').equalsIgnoreCase(name).first()
    if (exact) return exact

    try {
      const params = new URLSearchParams({ fuzzy: name })
      if (set) params.set('set', set)
      const res = await throttledFetch(`${BASE}/cards/named?${params}`)
      if (!res.ok) return null
      const card: ScryfallCard = await res.json()
      await db.scryfallCards.put(card)
      return card
    } catch {
      return null
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────

  interface SearchOptions {
    query: string
    page?: number
    order?: string
    dir?: 'asc' | 'desc'
  }

  interface SearchResult {
    cards: ScryfallCard[]
    totalCards: number
    hasMore: boolean
    nextPage?: string
  }

  async function searchCards(opts: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: opts.query,
      page: String(opts.page ?? 1),
      order: opts.order ?? 'name',
      dir: opts.dir ?? 'asc',
    })

    const res = await throttledFetch(`${BASE}/cards/search?${params}`)

    if (res.status === 404) return { cards: [], totalCards: 0, hasMore: false }
    if (!res.ok) throw new Error(`Scryfall search failed: ${res.status}`)

    const data = await res.json()
    const cards: ScryfallCard[] = data.data ?? []

    // Cache all returned cards
    await bulkUpsertScryfallCards(cards)

    return {
      cards,
      totalCards: data.total_cards ?? 0,
      hasMore: data.has_more ?? false,
      nextPage: data.next_page,
    }
  }

  // ── Local full-text search across cached cards ───────────────────────────

  async function localSearch(query: string, limit = 50): Promise<ScryfallCard[]> {
    const q = query.toLowerCase().trim()
    if (!q) return []

    // Try exact name first
    const byName = await db.scryfallCards
      .where('name')
      .startsWithIgnoreCase(q)
      .limit(limit)
      .toArray()

    if (byName.length >= limit) return byName

    // Supplement with full scan (slower, but works for type/text search)
    const rest = await db.scryfallCards
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.type_line?.toLowerCase().includes(q) ||
        c.oracle_text?.toLowerCase().includes(q) ||
        c.set_name?.toLowerCase().includes(q)
      )
      .limit(limit)
      .toArray()

    // Deduplicate by id
    const seen = new Set(byName.map(c => c.id))
    return [...byName, ...rest.filter(c => !seen.has(c.id))].slice(0, limit)
  }

  // ── Autocomplete ─────────────────────────────────────────────────────────

  async function autocomplete(query: string): Promise<string[]> {
    if (query.length < 2) return []

    // Try local first
    const local = await db.scryfallCards
      .where('name')
      .startsWithIgnoreCase(query)
      .limit(10)
      .toArray()

    if (local.length >= 5) return local.map(c => c.name)

    try {
      const res = await throttledFetch(`${BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`)
      if (!res.ok) return local.map(c => c.name)
      const data = await res.json()
      return data.data ?? []
    } catch {
      return local.map(c => c.name)
    }
  }

  // ── Bulk Data Import ─────────────────────────────────────────────────────

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

    // Get bulk data URL
    const metaRes = await fetch(BULK_META)
    const meta = await metaRes.json()
    const defaultCards = meta.data?.find((d: any) => d.type === 'default_cards')
    if (!defaultCards) throw new Error('Could not find default_cards bulk data')

    const downloadUrl: string = defaultCards.download_uri
    const expectedSize: number = defaultCards.size ?? 0

    onProgress({ phase: 'downloading', loaded: 0, total: expectedSize, percent: 0, message: 'Downloading card data (~100MB)…' })

    // Stream download with progress
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error('Bulk download failed')

    const reader = res.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
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

  // ── Sets ─────────────────────────────────────────────────────────────────

  async function getAllSets(): Promise<ScryfallSet[]> {
    const res = await throttledFetch(`${BASE}/sets`)
    if (!res.ok) return []
    const data = await res.json()
    return data.data ?? []
  }

  // ── Prints ───────────────────────────────────────────────────────────────

  async function getPrints(oracleId: string): Promise<ScryfallCard[]> {
    try {
      const res = await throttledFetch(
        `${BASE}/cards/search?q=oracleid:${oracleId}&unique=prints&order=released`
      )
      if (!res.ok) return []
      const data = await res.json()
      const cards: ScryfallCard[] = data.data ?? []
      await bulkUpsertScryfallCards(cards)
      return cards
    } catch {
      return []
    }
  }

  return {
    getCardById,
    getCardByName,
    searchCards,
    localSearch,
    autocomplete,
    importBulkData,
    getBulkMeta,
    getAllSets,
    getPrints,
  }
}
