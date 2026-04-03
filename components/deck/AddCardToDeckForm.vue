<template>
  <div class="space-y-4">
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Card Name</label>
      <AutoComplete
        v-model="searchQuery"
        :suggestions="suggestions"
        placeholder="Search…"
        class="w-full"
        @complete="onComplete"
        @item-select="onSelect"
      />
    </div>

    <div v-if="selectedCard" class="flex gap-3 p-3 bg-vault-surface2 rounded-xl animate-slide-up">
      <img
        :src="selectedCard.image_uris?.small ?? selectedCard.card_faces?.[0]?.image_uris?.small"
        class="w-16 rounded"
        :alt="selectedCard.name"
      />
      <div class="text-sm space-y-1">
        <p class="font-semibold">{{ selectedCard.name }}</p>
        <p class="text-vault-muted text-xs">{{ selectedCard.type_line }}</p>
        <ManaCost :cost="selectedCard.mana_cost ?? ''" />
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

    <div class="flex items-center gap-3">
      <ToggleSwitch v-model="isCommander" />
      <span class="text-sm text-vault-muted">Mark as Commander</span>
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
import type { ScryfallCard } from '~/types'

const props = defineProps<{ deckId: string }>()
const emit = defineEmits<{ added: []; close: [] }>()

const { autocomplete, getCardByName } = useScryfall()
const { addCardToDeck } = useDecks()

const searchQuery = ref('')
const suggestions = ref<string[]>([])
const selectedCard = ref<ScryfallCard | null>(null)
const qty = ref(1)
const zone = ref<'main' | 'side'>('main')
const isCommander = ref(false)

const ZONES = [
  { label: 'Mainboard', value: 'main' },
  { label: 'Sideboard', value: 'side' },
]

async function onComplete(e: { query: string }) {
  suggestions.value = await autocomplete(e.query)
}

async function onSelect(e: { value: string }) {
  selectedCard.value = await getCardByName(e.value)
}

async function add() {
  if (!selectedCard.value) return
  await addCardToDeck(props.deckId, {
    scryfallId: selectedCard.value.id,
    quantity: qty.value,
    isSideboard: zone.value === 'side',
    isCommander: isCommander.value,
    isCompanion: false,
  })
  emit('added')
}
</script>
