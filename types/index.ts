// ─── Scryfall API Types (comprehensive) ────────────────────────────────────

export interface ScryfallCard {
  // Core fields
  id: string
  oracle_id: string
  multiverse_ids: number[]
  mtgo_id?: number
  arena_id?: number
  tcgplayer_id?: number
  cardmarket_id?: number

  // Naming
  name: string
  lang: string
  released_at: string
  uri: string
  scryfall_uri: string
  layout: string

  // Mana & CMC
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  power?: string
  toughness?: string
  loyalty?: string
  defense?: string

  // Colors
  colors?: MtgColor[]
  color_identity: MtgColor[]
  color_indicator?: MtgColor[]
  produced_mana?: MtgColor[]

  // Keywords & misc
  keywords: string[]
  legalities: Record<MtgFormat, Legality>
  reserved: boolean
  foil: boolean
  nonfoil: boolean
  oversized: boolean
  promo: boolean
  reprint: boolean
  variation: boolean
  set_id: string
  set: string
  set_name: string
  set_type: string
  set_uri: string
  rulings_uri: string
  prints_search_uri: string
  collector_number: string
  digital: boolean
  rarity: Rarity
  flavor_text?: string
  card_back_id?: string
  artist?: string
  artist_ids?: string[]
  illustration_id?: string
  border_color: string
  frame: string
  full_art: boolean
  textless: boolean
  booster: boolean
  story_spotlight: boolean
  edhrec_rank?: number
  penny_rank?: number

  // Prices
  prices: ScryfallPrices

  // Images
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]

  // Related
  all_parts?: ScryfallRelatedCard[]

  // Games
  games: string[]
  purchase_uris?: Record<string, string>
  related_uris?: Record<string, string>
}

export interface ScryfallCardFace {
  name: string
  mana_cost?: string
  type_line?: string
  oracle_text?: string
  colors?: MtgColor[]
  power?: string
  toughness?: string
  loyalty?: string
  flavor_text?: string
  artist?: string
  artist_id?: string
  illustration_id?: string
  image_uris?: ScryfallImageUris
}

export interface ScryfallImageUris {
  small: string
  normal: string
  large: string
  png: string
  art_crop: string
  border_crop: string
}

export interface ScryfallPrices {
  usd?: string | null
  usd_foil?: string | null
  usd_etched?: string | null
  eur?: string | null
  eur_foil?: string | null
  tix?: string | null
}

export interface ScryfallRelatedCard {
  id: string
  component: string
  name: string
  type_line: string
  uri: string
}

export interface ScryfallSet {
  id: string
  code: string
  name: string
  uri: string
  scryfall_uri: string
  search_uri: string
  released_at: string
  set_type: string
  card_count: number
  digital: boolean
  nonfoil_only: boolean
  foil_only: boolean
  icon_svg_uri: string
}

export type MtgColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus'
export type Legality = 'legal' | 'not_legal' | 'restricted' | 'banned'
export type MtgFormat =
  | 'standard' | 'pioneer' | 'modern' | 'legacy' | 'vintage'
  | 'pauper' | 'commander' | 'oathbreaker' | 'brawl' | 'alchemy'
  | 'explorer' | 'historic' | 'timeless' | 'penny' | 'premodern'
  | 'oldschool' | 'predh' | 'duel' | 'historicbrawl' | 'paupercommander'
  | 'standardbrawl' | 'gladiator' | 'future'

// ─── App Domain Types ───────────────────────────────────────────────────────

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
export type CardLanguage =
  | 'en' | 'de' | 'fr' | 'it' | 'es' | 'pt' | 'ja' | 'ko'
  | 'ru' | 'zhs' | 'zht' | 'he' | 'la' | 'grc' | 'ar' | 'sa' | 'ph'

export interface CollectionEntry {
  id: string                    // UUID generated locally
  scryfallId: string            // Links to cached ScryfallCard
  quantity: number
  foilQuantity: number
  condition: CardCondition
  language: CardLanguage
  purchasePrice?: number
  purchaseDate?: string         // ISO date string
  notes?: string
  tags: string[]
  storage?: string              // "Binder A", "Box 1", etc.
  deckIds: string[]             // which decks reference this entry
  isProxy: boolean
  proxyPrintedAt?: string
  isCustom: boolean
  addedAt: string               // ISO date string
  updatedAt: string
}

export interface DeckCard {
  scryfallId: string
  quantity: number
  isSideboard: boolean
  isCommander: boolean
  isCompanion: boolean
  collectionEntryId?: string    // explicit link to owned copy
}

export interface Deck {
  id: string
  name: string
  format: MtgFormat | string
  description: string
  coverScryfallId?: string
  cards: DeckCard[]
  createdAt: string
  updatedAt: string
  tags: string[]
  colorIdentity: MtgColor[]
  isArchived: boolean
  notes: string
}

export interface CustomCard {
  id: string
  name: string
  manaCost: string
  typeLine: string
  oracleText: string
  flavorText?: string
  power?: string
  toughness?: string
  loyalty?: string
  colors: MtgColor[]
  colorIdentity: MtgColor[]
  rarity: Rarity
  set?: string
  artist?: string
  imageDataUrl?: string         // base64 stored image
  createdAt: string
  updatedAt: string
}

// ─── Stats Types ────────────────────────────────────────────────────────────

export interface CollectionStats {
  totalCards: number
  uniqueCards: number
  totalDecks: number
  totalValue: number
  totalFoils: number
  totalProxies: number
  byColor: Record<string, number>
  byRarity: Record<Rarity, number>
  byFormat: Record<string, number>
  bySet: { set: string; setName: string; count: number }[]
  byType: Record<string, number>
  recentlyAdded: CollectionEntry[]
  mostUsedCards: { entry: CollectionEntry; card: ScryfallCard; deckCount: number }[]
  valueOverTime: { date: string; value: number }[]
}

export interface DeckStats {
  cardCount: number
  uniqueCount: number
  avgManaValue: number
  manaCurve: Record<number, number>
  colorDistribution: Record<MtgColor, number>
  typeBreakdown: Record<string, number>
  missingCards: DeckCard[]        // cards in deck not in collection
  proxiedCards: DeckCard[]
  estimatedValue: number
  legalIn: MtgFormat[]
}
