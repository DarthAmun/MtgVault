# MTG Vault 🃏

A personal Magic: The Gathering collection manager. Offline-first PWA built with Nuxt 3, Vue 3, Tailwind CSS, PrimeVue, and Dexie.js.

## Features

- **Collection Management** — Add, filter, and browse your entire card collection with full Scryfall data cached locally
- **Deck Builder** — Build and manage decks with mainboard/sideboard support, import from text lists
- **Bulk Import** — Paste card lists in Moxfield/MTGO format to add cards to your collection or decks
- **Stats Dashboard** — Color distribution, rarity breakdown, set breakdown, estimated value
- **Proxy & Custom Cards** — Mark cards as proxies, create custom cards with a canvas-based card editor
- **Offline-First PWA** — Installable, works without internet after initial bulk data download
- **Full Scryfall Cache** — Every card field stored locally in IndexedDB for fast search and future features

---

## Tech Stack

| Layer       | Choice                      |
|-------------|-----------------------------|
| Framework   | Nuxt 3                      |
| UI          | Vue 3 + PrimeVue 4 + Tailwind CSS |
| Database    | Dexie.js (IndexedDB)        |
| Card Data   | Scryfall API + local bulk cache |
| OCR         | Tesseract.js v5             |
| ML          | TensorFlow.js               |
| PWA         | @vite-pwa/nuxt (Workbox)    |
| State       | Pinia                       |

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start dev server

```bash
pnpm dev
```

Open http://localhost:3000

### 3. Download card database (recommended)

Go to **Settings → Download** to fetch the full Scryfall bulk data (~100MB). This enables:
- Fast offline card search
- Best scanner accuracy (local fuzzy matching)
- No rate limiting

Without it, card lookup will not work. The app is fully offline after the initial download.

### 4. Build for production

```bash
pnpm build
pnpm preview
```

---

## Project Structure

```
mtg-vault/
├── assets/css/
│   └── main.css              # Design tokens, global styles
├── components/
│   ├── cards/
│   │   ├── AddCardForm.vue        # Add card to collection dialog
│   │   ├── CardDetailPanel.vue    # Drawer with full card info
│   │   ├── CollectionCardThumb.vue # Grid view card tile
│   │   ├── CollectionFilters.vue  # Search + filter bar
│   │   ├── CollectionListRow.vue  # List view row
│   │   ├── CustomCardEditor.vue   # Canvas-based custom card creator
│   │   ├── ImportForm.vue         # Bulk text import
│   │   ├── InfoRow.vue            # Label/value display helper
│   │   └── ManaCost.vue           # Mana symbol renderer
│   ├── deck/
│   │   ├── AddCardToDeckForm.vue
│   │   ├── DeckCard.vue           # Deck grid tile
│   │   ├── DeckCardList.vue       # Card list within a deck
│   │   ├── DeckStatsBar.vue       # Quick stats strip
│   │   ├── DeckStatsDetail.vue    # Full stats with mana curve
│   │   └── NewDeckForm.vue
│   ├── layout/
│   │   ├── NavItem.vue
│   │   └── QuickAction.vue
│   ├── scanner/
│   │   └── ScanResultCard.vue     # Individual scan candidate
│   └── stats/
│       ├── ColorDistributionChart.vue
│       └── StatCard.vue
├── composables/
│   ├── useCollection.ts      # Collection CRUD + import/export
│   ├── useDecks.ts           # Deck management + stats
│   ├── useScanner.ts         # Camera + TF.js + Tesseract OCR pipeline
│   ├── useScryfall.ts        # Scryfall API + local cache
│   └── useStats.ts           # Collection analytics
├── db/
│   └── index.ts              # Dexie schema (collection, decks, scryfallCards, customCards)
├── layouts/
│   └── default.vue           # Sidebar navigation shell
├── pages/
│   ├── index.vue             # Dashboard
│   ├── collection/index.vue  # Collection browser
│   ├── decks/
│   │   ├── index.vue         # Deck list
│   │   └── [id].vue          # Deck detail + editor
│   ├── scan/index.vue        # Camera scanner
│   ├── stats/index.vue       # Statistics
│   ├── proxies/index.vue     # Proxy management + print
│   └── settings/index.vue    # Bulk download, export, reset
└── types/
    └── index.ts              # All TypeScript types (ScryfallCard, CollectionEntry, Deck, …)
```

---

## Scanner Architecture

The scanner uses a three-step pipeline:

1. **Frame capture** — `getUserMedia` streams the rear camera into a `<video>` element, mirrored onto a `<canvas>`
2. **Name bar crop** — The canvas renders a card-shaped guide overlay. On scan, the top ~8% of the card region (the name bar) is cropped and upscaled 4× for better OCR
3. **OCR + matching**
   - Tesseract.js reads the name bar (single-line mode, alphanumeric only)
   - The result is fuzzy-matched against the local Scryfall IndexedDB first
   - Falls back to Scryfall `/cards/named?fuzzy=` API if no local match

**Tips for improving accuracy:**
- After downloading bulk data, local matching is much faster and works offline
- Good even lighting, no glare, card held steady
- The blue guide rectangle shows where Tesseract looks — align card names there

**Future improvements (Claude Code TODOs):**
- Add homography/perspective correction with OpenCV.js for angled cards
- Train a lightweight MobileNet classifier on MTG set symbols for set detection
- Add pHash-based art matching as a secondary signal

---

## Scryfall Data

All card data comes from [Scryfall](https://scryfall.com). Every field of the Scryfall card object is stored flat in IndexedDB with rich indexes:

```
id, oracle_id, name, set, set_name, type_line, rarity,
cmc, colors, color_identity, keywords, collector_number,
artist, released_at, layout, …
```

This enables fast local queries like:
- Cards by color identity
- Cards by type containing "Dragon"
- Cards in a specific set
- Cards below a CMC threshold
- Full-text oracle text search

The bulk data endpoint (`https://data.scryfall.com/default-cards/`) is ~100MB and contains ~30,000 unique cards (all printings). Download it once from Settings and the app is fully offline.

---

## PWA & Electron

### PWA (default)
The app installs as a PWA via `@vite-pwa/nuxt`. Card images are cached via Workbox's `CacheFirst` strategy with a 30-day TTL.

### Electron (future)
When you're ready to wrap as a desktop app:

```bash
pnpm add -D electron electron-builder
```

Then add an `electron/main.ts` that loads `http://localhost:3000` or the built output. The existing codebase is fully compatible — no changes needed to the Nuxt app itself.

---

## Roadmap / TODOs for Claude Code

- [x] `pages/proxies/index.vue` — Implement jsPDF print sheet (3×3 grid, A4/Letter)
- [ ] `pages/decks/[id].vue` — Add drag-and-drop card reordering
- [x] `composables/useStats.ts` — Add `valueOverTime` tracking (snapshot on each sync)
- [x] `components/cards/CustomCardEditor.vue` — Add color-based card frame gradients per color identity
- [ ] Add Pinia stores as the composables grow — consider `stores/collection.ts`, `stores/decks.ts`
- [x] Add PWA install prompt component
- [x] Add CSV export
- [x] Add `pages/collection/[scryfallId].vue` — all-printings view for a single card

---

## License

MIT — do whatever you want with it.
