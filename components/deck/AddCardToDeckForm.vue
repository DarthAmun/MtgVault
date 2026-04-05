<template>
  <div class="space-y-4">
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Card Name</label>
      <AutoComplete
        v-model="searchQuery"
        :suggestions="suggestions"
        option-label="name"
        placeholder="Search local database…"
        class="w-full"
        @complete="onComplete"
        @item-select="onSelect"
      >
        <template #option="{ option }">
          <div class="flex items-center gap-3 py-1">
            <img
              v-if="option.image_uris?.small ?? option.card_faces?.[0]?.image_uris?.small"
              :src="option.image_uris?.small ?? option.card_faces?.[0]?.image_uris?.small"
              :alt="option.name"
              class="w-9 h-12 rounded object-cover shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-vault-text truncate">{{ option.name }}</p>
              <p class="text-xs text-vault-muted truncate">{{ option.set_name }} · #{{ option.collector_number }}</p>
            </div>
          </div>
        </template>
      </AutoComplete>
    </div>

    <div v-if="selectedCard" class="flex gap-3 p-3 bg-vault-surface2 rounded-xl animate-slide-up">
      <img
        :src="selectedCard.image_uris?.small ?? selectedCard.card_faces?.[0]?.image_uris?.small"
        class="w-16 rounded shrink-0"
        :alt="selectedCard.name"
      />
      <div class="text-sm space-y-1 min-w-0 flex-1">
        <p class="font-semibold truncate">{{ selectedCard.name }}</p>
        <p class="text-vault-muted text-xs truncate">{{ selectedCard.type_line }}</p>
        <p class="text-vault-dim text-xs">{{ selectedCard.set_name }} · #{{ selectedCard.collector_number }}</p>
        <ManaCost :cost="selectedCard.mana_cost ?? ''" />

        <!-- Availability -->
        <div v-if="availability" class="mt-1.5 flex gap-3 text-[11px]">
          <span class="text-vault-muted">
            Owned: <span class="font-semibold" :class="availability.totalOwned > 0 ? 'text-emerald-400' : 'text-red-400'">{{ availability.totalOwned }}</span>
          </span>
          <span v-if="availability.inDecks > 0" class="text-vault-muted">
            In decks: <span class="font-semibold text-amber-400">{{ availability.inDecks }}</span>
          </span>
          <span class="text-vault-muted">
            Available: <span class="font-semibold" :class="availability.available > 0 ? 'text-vault-text' : 'text-red-400'">{{ availability.available }}</span>
          </span>
        </div>
        <p v-if="availability && availability.available <= 0 && availability.totalOwned > 0" class="text-[11px] text-amber-400">
          All copies are already in decks
        </p>
        <p v-if="availability && availability.totalOwned === 0" class="text-[11px] text-red-400">
          Not in collection — will be marked as not owned
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-sm text-vault-muted mb-1 block">Quantity</label>
        <InputNumber v-model="qty" :min="1" :max="20" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-vault-muted mb-1 block">Zone</label>
        <Select v-model="zone" :options="ZONES" option-label="label" option-value="value" class="w-full" />
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="isCommander" />
        <span class="text-sm text-vault-muted">Commander</span>
      </div>
      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="isFoil" />
        <span class="text-sm text-vault-muted">Foil</span>
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2 border-t border-vault-border">
      <Button label="Cancel" outlined @click="$emit('close')" />
      <Button label="Add to Deck" :disabled="!selectedCard" @click="add" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScryfall } from '~/composables/useScryfall'
import { useDecks } from '~/composables/useDecks'
import { db } from '~/db'
import type { ScryfallCard } from '~/types'

const props = defineProps<{ deckId: string }>()
const emit = defineEmits<{ added: []; close: [] }>()

const { autocompleteCards } = useScryfall()
const { addCardToDeck } = useDecks()

const searchQuery = ref<string | ScryfallCard>('')
const suggestions = ref<ScryfallCard[]>([])
const selectedCard = ref<ScryfallCard | null>(null)
const qty = ref(1)
const zone = ref<'main' | 'side'>('main')
const isCommander = ref(false)
const isFoil = ref(false)

interface Availability { totalOwned: number; inDecks: number; available: number }
const availability = ref<Availability | null>(null)

const ZONES = [
  { label: 'Mainboard', value: 'main' },
  { label: 'Sideboard', value: 'side' },
]

async function onComplete(e: { query: string }) {
  suggestions.value = await autocompleteCards(e.query)
}

async function onSelect(e: { value: ScryfallCard }) {
  selectedCard.value = e.value
  searchQuery.value = e.value.name
  availability.value = null
  await loadAvailability(e.value)
}

async function loadAvailability(card: ScryfallCard) {
  const allPrintings = card.oracle_id
    ? await db.scryfallCards.where('oracle_id').equals(card.oracle_id).toArray()
    : [card]
  const printingIds = new Set(allPrintings.map(p => p.id))

  const entries = await db.collection.filter(e => printingIds.has(e.scryfallId)).toArray()
  const totalOwned = entries.reduce((s, e) => s + e.quantity + (e.foilQuantity ?? 0), 0)

  // Count copies already in decks (excluding this deck)
  const allDecks = await db.decks.toArray()
  const inDecks = allDecks
    .filter(d => d.id !== props.deckId)
    .reduce((sum, deck) =>
      sum + deck.cards
        .filter(dc => printingIds.has(dc.scryfallId) && !dc.notOwned)
        .reduce((s, dc) => s + dc.quantity, 0)
    , 0)

  availability.value = { totalOwned, inDecks, available: Math.max(0, totalOwned - inDecks) }
}

async function add() {
  if (!selectedCard.value) return
  await addCardToDeck(props.deckId, {
    scryfallId: selectedCard.value.id,
    quantity: qty.value,
    isSideboard: zone.value === 'side',
    isCommander: isCommander.value,
    isCompanion: false,
    foil: isFoil.value || undefined,
  })
  emit('added')
}
</script>
