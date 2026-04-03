<template>
  <div v-if="deck" class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p class="text-vault-muted text-xs uppercase tracking-wider mb-1">{{ deck.format }}</p>
        <h1 class="font-display text-3xl text-vault-gold">{{ deck.name }}</h1>
        <div class="flex items-center gap-2 mt-2">
          <span
            v-for="color in deck.colorIdentity"
            :key="color"
            class="color-pip w-5 h-5"
            :class="`mana-${color}`"
          />
          <span class="text-vault-muted text-sm">{{ totalCards }} cards</span>
        </div>
      </div>
      <div class="flex gap-2">
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

    <!-- Card list -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Mainboard -->
      <div class="vault-card p-4">
        <h2 class="font-display text-vault-text mb-3">Mainboard ({{ mainCards.length }})</h2>
        <DeckCardList :cards="mainCards" :deck-id="deck.id" @changed="reload" />
      </div>

      <!-- Sideboard -->
      <div class="vault-card p-4">
        <h2 class="font-display text-vault-text mb-3">Sideboard ({{ sideCards.length }})</h2>
        <DeckCardList :cards="sideCards" :deck-id="deck.id" @changed="reload" />
      </div>
    </div>

    <!-- Missing cards alert -->
    <div v-if="stats?.missingCards.length" class="vault-card p-4 border-amber-500/30">
      <h3 class="text-amber-400 font-semibold text-sm mb-2">
        <v-icon name="fa-exclamation-triangle" class="mr-1" />
        Missing {{ stats.missingCards.length }} cards from collection
      </h3>
      <p class="text-vault-muted text-xs">These cards are in the deck but not in your collection.</p>
    </div>

    <!-- Dialogs -->
    <Dialog v-model:visible="showAdd" modal header="Add Card to Deck" class="w-full max-w-md">
      <AddCardToDeckForm :deck-id="deck.id" @added="onAdded" @close="showAdd = false" />
    </Dialog>

    <Dialog v-model:visible="showStats" modal header="Deck Statistics" class="w-full max-w-2xl">
      <DeckStatsDetail v-if="stats" :stats="stats" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import { db } from '~/db'
import type { Deck, DeckStats, ScryfallCard } from '~/types'

const route = useRoute()
const { getById, getDeckStats } = useDecks()

const deck = ref<Deck | null>(null)
const stats = ref<DeckStats | null>(null)
const showAdd = ref(false)
const showImport = ref(false)
const showStats = ref(false)

interface EnrichedCard { dc: (typeof deck.value)['cards'][0]; card?: ScryfallCard }
const mainCards = ref<EnrichedCard[]>([])
const sideCards = ref<EnrichedCard[]>([])

const totalCards = computed(() =>
  deck.value?.cards.filter(c => !c.isSideboard).reduce((s, c) => s + c.quantity, 0) ?? 0
)

async function reload() {
  deck.value = await getById(route.params.id as string)
  if (!deck.value) return

  stats.value = await getDeckStats(deck.value.id)

  const enrich = async (cards: typeof deck.value.cards) =>
    Promise.all(cards.map(async dc => ({ dc, card: await db.scryfallCards.get(dc.scryfallId) })))

  mainCards.value = await enrich(deck.value.cards.filter(c => !c.isSideboard))
  sideCards.value = await enrich(deck.value.cards.filter(c => c.isSideboard))
}

async function onAdded() {
  showAdd.value = false
  await reload()
}

onMounted(reload)
</script>
