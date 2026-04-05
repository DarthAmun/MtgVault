import { db } from '~/db'
import type { CollectionEntry, CardCondition, CardLanguage } from '~/types'

export function useCollection() {
  // ── Add / Update / Remove ────────────────────────────────────────────────

  async function addCard(entry: Omit<CollectionEntry, 'id' | 'addedAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const full: CollectionEntry = { ...entry, id, addedAt: now, updatedAt: now }
    await db.collection.put(full)
    return id
  }

  async function updateCard(id: string, changes: Partial<CollectionEntry>): Promise<void> {
    await db.collection.update(id, { ...changes, updatedAt: new Date().toISOString() })
  }

  async function removeCard(id: string): Promise<void> {
    await db.collection.delete(id)
  }

  async function incrementQuantity(id: string, delta = 1, foil = false): Promise<void> {
    const entry = await db.collection.get(id)
    if (!entry) return
    if (foil) {
      await db.collection.update(id, {
        foilQuantity: Math.max(0, (entry.foilQuantity ?? 0) + delta),
        updatedAt: new Date().toISOString(),
      })
    } else {
      await db.collection.update(id, {
        quantity: Math.max(0, entry.quantity + delta),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  async function getAll(): Promise<CollectionEntry[]> {
    return db.collection.toArray()
  }

  async function getById(id: string): Promise<CollectionEntry | null> {
    return db.collection.get(id) ?? null
  }

  async function getByScryfallId(scryfallId: string): Promise<CollectionEntry[]> {
    return db.collection.where('scryfallId').equals(scryfallId).toArray()
  }

  async function getByDeck(deckId: string): Promise<CollectionEntry[]> {
    return db.collection.where('deckIds').equals(deckId).toArray()
  }

  async function getByTag(tag: string): Promise<CollectionEntry[]> {
    return db.collection.where('tags').equals(tag).toArray()
  }

  async function getByStorage(location: string): Promise<CollectionEntry[]> {
    return db.collection.where('storage').equals(location).toArray()
  }

  async function getProxies(): Promise<CollectionEntry[]> {
    return db.collection.where('isProxy').equals(1).toArray()
  }

  async function count(): Promise<number> {
    return db.collection.count()
  }

  async function totalQuantity(): Promise<number> {
    const all = await db.collection.toArray()
    return all.reduce((sum, e) => sum + e.quantity + (e.foilQuantity ?? 0), 0)
  }

  // ── Import / Export ──────────────────────────────────────────────────────

  interface TextImportLine {
    quantity: number
    name: string
    set?: string
    collectorNumber?: string
    foil?: boolean
  }

  function parseTextList(text: string): TextImportLine[] {
    const lines = text.trim().split('\n')
    const results: TextImportLine[] = []

    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith('//') || line.startsWith('#')) continue

      // Common formats:
      // "4 Lightning Bolt"
      // "4x Lightning Bolt"
      // "4 Lightning Bolt (M11) 149"
      // "4 *F* Lightning Bolt"
      const match = line.match(/^(\d+)x?\s+(\*F\*\s+)?(.+?)(?:\s+\(([A-Z0-9]+)\)(?:\s+(\d+))?)?$/)
      if (!match) continue

      results.push({
        quantity: parseInt(match[1]),
        foil: !!match[2],
        name: match[3].trim(),
        set: match[4]?.toLowerCase(),
        collectorNumber: match[5],
      })
    }

    return results
  }

  async function exportToText(): Promise<string> {
    const entries = await db.collection.toArray()
    const lines: string[] = []

    for (const entry of entries) {
      const card = await db.scryfallCards.get(entry.scryfallId)
      if (!card) continue
      if (entry.quantity > 0) {
        lines.push(`${entry.quantity} ${card.name} (${card.set.toUpperCase()}) ${card.collector_number}`)
      }
      if ((entry.foilQuantity ?? 0) > 0) {
        lines.push(`${entry.foilQuantity} *F* ${card.name} (${card.set.toUpperCase()}) ${card.collector_number}`)
      }
    }

    return lines.join('\n')
  }

  async function exportToJSON(): Promise<string> {
    const entries = await db.collection.toArray()
    return JSON.stringify(entries, null, 2)
  }

  async function exportToCSV(): Promise<string> {
    const entries = await db.collection.toArray()
    const header = ['Name', 'Set', 'Collector Number', 'Quantity', 'Foil Quantity', 'Condition', 'Language', 'Foil', 'Proxy', 'Custom', 'Tags', 'Storage', 'Purchase Price', 'Added At']
    const rows = await Promise.all(entries.map(async entry => {
      const card = await db.scryfallCards.get(entry.scryfallId)
      return [
        card?.name ?? entry.scryfallId,
        card?.set?.toUpperCase() ?? '',
        card?.collector_number ?? '',
        entry.quantity,
        entry.foilQuantity ?? 0,
        entry.condition,
        entry.language,
        (entry.foilQuantity ?? 0) > 0 ? 'Yes' : 'No',
        entry.isProxy ? 'Yes' : 'No',
        entry.isCustom ? 'Yes' : 'No',
        entry.tags.join(';'),
        entry.storage ?? '',
        entry.purchasePrice ?? '',
        entry.addedAt.slice(0, 10),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    }))
    return [header.map(h => `"${h}"`).join(','), ...rows].join('\n')
  }

  return {
    addCard,
    updateCard,
    removeCard,
    incrementQuantity,
    getAll,
    getById,
    getByScryfallId,
    getByDeck,
    getByTag,
    getByStorage,
    getProxies,
    count,
    totalQuantity,
    parseTextList,
    exportToText,
    exportToJSON,
    exportToCSV,
  }
}
