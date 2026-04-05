import { db } from '~/db'
import type { CustomCard, ScryfallCard, MtgColor, Rarity } from '~/types'

/** Prefix used to distinguish custom card IDs from Scryfall IDs */
export const CUSTOM_ID_PREFIX = 'custom_'

export function isCustomId(id: string) {
  return id.startsWith(CUSTOM_ID_PREFIX)
}

/** Build a ScryfallCard-shaped record from a CustomCard so the rest of the app treats it normally */
function toScryfallCard(raw: CustomCard): ScryfallCard {
  // Deep-copy to ensure no reactive proxies reach IndexedDB
  const c: CustomCard = JSON.parse(JSON.stringify(raw))
  const id = CUSTOM_ID_PREFIX + c.id
  const imageUris = c.imageDataUrl
    ? { small: c.imageDataUrl, normal: c.imageDataUrl, large: c.imageDataUrl, png: c.imageDataUrl, art_crop: c.imageDataUrl, border_crop: c.imageDataUrl }
    : undefined

  return {
    id,
    oracle_id: id,
    multiverse_ids: [],
    name: c.name,
    lang: 'en',
    released_at: c.createdAt.slice(0, 10),
    uri: '',
    scryfall_uri: '',
    layout: 'normal',
    mana_cost: c.manaCost || undefined,
    cmc: parseCmc(c.manaCost),
    type_line: c.typeLine,
    oracle_text: c.oracleText || undefined,
    power: c.power || undefined,
    toughness: c.toughness || undefined,
    loyalty: c.loyalty || undefined,
    colors: c.colors,
    color_identity: c.colorIdentity,
    keywords: [],
    legalities: {} as any,
    reserved: false,
    foil: false,
    nonfoil: true,
    oversized: false,
    promo: false,
    reprint: false,
    variation: false,
    set_id: 'custom',
    set: 'custom',
    set_name: 'Custom Cards',
    set_type: 'custom',
    set_uri: '',
    rulings_uri: '',
    prints_search_uri: '',
    collector_number: '?',
    digital: false,
    rarity: c.rarity,
    flavor_text: c.flavorText || undefined,
    artist: c.artist || undefined,
    border_color: 'black',
    frame: '2015',
    full_art: false,
    textless: false,
    booster: false,
    story_spotlight: false,
    prices: { usd: null, usd_foil: null, eur: null, tix: null },
    games: [],
    image_uris: imageUris,
  } as ScryfallCard
}

/** Rough CMC parser: count each {X} symbol (ignoring {W/U} etc for simplicity) */
function parseCmc(manaCost: string): number {
  if (!manaCost) return 0
  let cmc = 0
  for (const m of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const s = m[1]
    const num = parseInt(s)
    if (!isNaN(num)) cmc += num
    else if (s !== 'X' && s !== 'x') cmc += 1
  }
  return cmc
}

export function useCustomCards() {
  async function saveCustomCard(card: CustomCard): Promise<void> {
    await db.customCards.put(card)

    // Upsert synthetic ScryfallCard so the rest of the app can find it
    const sc = toScryfallCard(card)
    await db.scryfallCards.put(sc)

    // Add to collection if not already there
    const scryfallId = sc.id
    const existing = await db.collection.where('scryfallId').equals(scryfallId).first()
    if (!existing) {
      const now = new Date().toISOString()
      await db.collection.put({
        id: crypto.randomUUID(),
        scryfallId,
        quantity: 1,
        foilQuantity: 0,
        condition: 'NM',
        language: 'en',
        isProxy: false,
        isCustom: true,
        tags: [],
        deckIds: [],
        addedAt: now,
        updatedAt: now,
      })
    }
  }

  async function deleteCustomCard(cardId: string): Promise<void> {
    const scryfallId = CUSTOM_ID_PREFIX + cardId
    // Remove from collection
    const entries = await db.collection.where('scryfallId').equals(scryfallId).toArray()
    await Promise.all(entries.map(e => db.collection.delete(e.id)))
    // Remove synthetic ScryfallCard
    await db.scryfallCards.delete(scryfallId)
    // Remove CustomCard record
    await db.customCards.delete(cardId)
  }

  async function getAll(): Promise<CustomCard[]> {
    return db.customCards.orderBy('createdAt').reverse().toArray()
  }

  async function getById(id: string): Promise<CustomCard | null> {
    return (await db.customCards.get(id)) ?? null
  }

  return { saveCustomCard, deleteCustomCard, getAll, getById }
}
