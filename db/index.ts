import Dexie, { type Table } from 'dexie'
import type { CollectionEntry, Deck, CustomCard, ScryfallCard } from '~/types'

export class MTGVaultDatabase extends Dexie {
  // App tables
  collection!: Table<CollectionEntry, string>
  decks!: Table<Deck, string>
  customCards!: Table<CustomCard, string>

  // Scryfall cache — every field from API stored flat for fast local queries
  scryfallCards!: Table<ScryfallCard, string>

  // Bulk data metadata
  syncMeta!: Table<{ key: string; value: string | number }, string>

  constructor() {
    super('MTGVault')

    this.version(1).stores({
      // Collection: index on scryfallId, tags, deckIds, storage, isProxy
      collection: 'id, scryfallId, condition, language, *tags, *deckIds, storage, isProxy, isCustom, addedAt',

      // Decks: index on format, tags, colorIdentity
      decks: 'id, name, format, *tags, *colorIdentity, createdAt, updatedAt, isArchived',

      // Custom cards
      customCards: 'id, name, *colors, *colorIdentity, rarity, createdAt',

      // Scryfall card cache — rich indexes for search & filter
      scryfallCards: [
        'id',
        'oracle_id',
        'name',
        'set',
        'set_name',
        'type_line',
        'rarity',
        'cmc',
        '*colors',
        '*color_identity',
        '*keywords',
        'collector_number',
        'artist',
        'released_at',
        'layout',
      ].join(', '),

      syncMeta: 'key',
    })
  }
}

export const db = new MTGVaultDatabase()

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function getOrFetchScryfallCard(
  scryfallId: string,
  fetchFn: (id: string) => Promise<ScryfallCard>
): Promise<ScryfallCard | null> {
  const cached = await db.scryfallCards.get(scryfallId)
  if (cached) return cached
  try {
    const card = await fetchFn(scryfallId)
    await db.scryfallCards.put(card)
    return card
  } catch {
    return null
  }
}

export async function bulkUpsertScryfallCards(cards: ScryfallCard[]): Promise<void> {
  const CHUNK = 500
  for (let i = 0; i < cards.length; i += CHUNK) {
    await db.scryfallCards.bulkPut(cards.slice(i, i + CHUNK))
  }
}
