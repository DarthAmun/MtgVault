<template>
  <div v-if="deck" class="p-4 md:p-6 space-y-4 md:space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div class="flex gap-4 items-start">
        <!-- Commander art thumbnail -->
        <div
          v-if="headerImage"
          class="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md"
          style="object-fit: cover;"
        >
          <img :src="headerImage" :alt="deck.name" class="w-full h-full object-cover object-top" />
        </div>
        <div>
          <p class="text-vault-muted text-xs uppercase tracking-wider mb-0.5">{{ deck.format }}</p>
          <h1 class="font-display text-3xl text-vault-gold">{{ deck.name }}</h1>
          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              v-for="color in deck.colorIdentity"
              :key="color"
              class="color-pip w-5 h-5"
              :class="`mana-${color}`"
            />
            <span class="text-vault-muted text-sm">{{ totalCards }} cards</span>
            <span v-if="stats?.missingCards.length" class="text-amber-400 text-xs">
              · {{ stats.missingCards.length }} missing
            </span>
          </div>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <Button label="Stats" outlined @click="showStats = true">
          <template #icon><v-icon name="fa-chart-bar" class="mr-2" /></template>
        </Button>
        <Button label="Import" outlined @click="showImport = true">
          <template #icon><v-icon name="fa-file-import" class="mr-2" /></template>
        </Button>
        <Button label="Add Card" @click="showAdd = true">
          <template #icon><v-icon name="fa-plus" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Stats bar -->
    <DeckStatsBar v-if="stats" :stats="stats" />

    <!-- Board tabs -->
    <div class="flex gap-1 border-b border-vault-border pb-0">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-sm font-medium transition-colors rounded-t-lg relative"
        :class="activeTab === tab.key
          ? 'text-vault-accent bg-vault-surface2'
          : 'text-vault-muted hover:text-vault-text'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span class="ml-1.5 text-xs text-vault-dim">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Mainboard -->
    <div v-show="activeTab === 'main'" class="vault-card p-5">
      <DeckBoardView :cards="mainCards" :deck-id="deck.id" @changed="reload" />
    </div>

    <!-- Sideboard -->
    <div v-show="activeTab === 'side'" class="vault-card p-5">
      <div class="space-y-1">
        <DeckBoardRow
          v-for="item in sideCards"
          :key="item.dc.scryfallId"
          :item="item"
          :deck-id="deck.id"
          @changed="reload"
        />
        <p v-if="!sideCards.length" class="text-vault-dim text-xs text-center py-4">No sideboard cards</p>
      </div>
    </div>

    <!-- Dialogs -->
    <Dialog v-model:visible="showAdd" modal header="Add Card to Deck" class="w-full max-w-md">
      <AddCardToDeckForm :deck-id="deck.id" @added="onAdded" @close="showAdd = false" />
    </Dialog>

    <Dialog v-model:visible="showImport" modal header="Import Cards" class="w-full max-w-md">
      <div class="space-y-4">
        <p class="text-xs text-vault-muted">
          One card per line. Formats: <span class="font-mono">1 Sol Ring</span> · <span class="font-mono">1 Arahbo (C17) 35</span> · <span class="font-mono">1 Arahbo (C17) 35 *F*</span><br>
          Use <span class="font-mono">Commander:</span> / <span class="font-mono">Sideboard:</span> section headers or <span class="font-mono">SB:</span> prefix.
        </p>
        <Textarea v-model="importText" rows="12" class="w-full font-mono text-xs" placeholder="Commander:&#10;1 Arahbo, Roar of the World (C17) 35&#10;&#10;Deck:&#10;1 Sol Ring (CMR) 263&#10;4 Lightning Bolt (M11) 149 *F*&#10;…" />
        <div v-if="importingDeck" class="space-y-1">
          <ProgressBar :value="importDeckProgress" />
          <p class="text-xs text-vault-muted text-center">{{ importDeckMsg }}</p>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-vault-border">
          <Button label="Cancel" outlined :disabled="importingDeck" @click="showImport = false" />
          <Button label="Import" :loading="importingDeck" :disabled="!importText.trim() || importingDeck" @click="doImport" />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="showStats" modal header="Deck Statistics" class="w-full max-w-2xl">
      <DeckStatsDetail v-if="stats" :stats="stats" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import { useScryfall } from '~/composables/useScryfall'
import { db } from '~/db'
import type { Deck, DeckStats, ScryfallCard } from '~/types'

const route = useRoute()
const { getById, getDeckStats, parseDeckList, addCardToDeck } = useDecks()
const { localGetCardByName, localGetCardBySetAndNumber } = useScryfall()

const deck = ref<Deck | null>(null)
const stats = ref<DeckStats | null>(null)
const showAdd = ref(false)
const showImport = ref(false)
const showStats = ref(false)
const importText = ref('')
const importingDeck = ref(false)
const importDeckProgress = ref(0)
const importDeckMsg = ref('')
const activeTab = ref<'main' | 'side'>('main')
const headerImage = ref<string | undefined>()

type EnrichedCard = {
  dc: Deck['cards'][0]
  card?: ScryfallCard
}

const mainCards = ref<EnrichedCard[]>([])
const sideCards = ref<EnrichedCard[]>([])

const totalCards = computed(() =>
  deck.value?.cards.filter(c => !c.isSideboard).reduce((s, c) => s + c.quantity, 0) ?? 0
)

const tabs = computed(() => [
  { key: 'main' as const, label: 'Mainboard', count: mainCards.value.reduce((s, i) => s + i.dc.quantity, 0) },
  { key: 'side' as const, label: 'Sideboard', count: sideCards.value.reduce((s, i) => s + i.dc.quantity, 0) },
])

async function reload() {
  deck.value = await getById(route.params.id as string)
  if (!deck.value) return

  stats.value = await getDeckStats(deck.value.id)

  const enrich = async (cards: Deck['cards']) =>
    Promise.all(cards.map(async dc => ({ dc, card: await db.scryfallCards.get(dc.scryfallId) })))

  mainCards.value = await enrich(deck.value.cards.filter(c => !c.isSideboard))
  sideCards.value = await enrich(deck.value.cards.filter(c => c.isSideboard))

  // Header image: commander > first mainboard card
  const imgCandidates = [
    deck.value.cards.find(c => c.isCommander)?.scryfallId,
    deck.value.cards.find(c => !c.isSideboard)?.scryfallId,
  ].filter(Boolean) as string[]
  for (const id of imgCandidates) {
    const card = await db.scryfallCards.get(id)
    const img = card?.image_uris?.art_crop ?? card?.card_faces?.[0]?.image_uris?.art_crop
    if (img) { headerImage.value = img; break }
  }
}

async function onAdded() {
  showAdd.value = false
  await reload()
}

async function doImport() {
  if (!deck.value || !importText.value.trim()) return
  importingDeck.value = true
  const lines = parseDeckList(importText.value)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    importDeckProgress.value = Math.round((i / lines.length) * 100)
    importDeckMsg.value = line.name

    let card = (line.set && line.collectorNumber)
      ? await localGetCardBySetAndNumber(line.set, line.collectorNumber)
      : null
    if (!card) card = await localGetCardByName(line.name, line.set)

    if (card) {
      await addCardToDeck(deck.value.id, {
        scryfallId: card.id,
        quantity: line.quantity,
        isSideboard: line.isSideboard,
        isCommander: line.isCommander,
        isCompanion: false,
        foil: line.foil || undefined,
      })
    }
  }
  importingDeck.value = false
  showImport.value = false
  importText.value = ''
  await reload()
}

onMounted(reload)
</script>
