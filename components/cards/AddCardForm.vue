<template>
  <div class="space-y-4">
    <!-- Card search -->
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Card Name</label>
      <AutoComplete
        v-model="searchQuery"
        :suggestions="suggestions"
        placeholder="Search Scryfall…"
        class="w-full"
        @complete="onComplete"
        @item-select="onSelect"
      />
    </div>

    <!-- Preview -->
    <div v-if="selectedCard" class="flex gap-4 p-3 bg-vault-surface2 rounded-xl animate-slide-up">
      <img
        :src="selectedCard.image_uris?.normal ?? selectedCard.card_faces?.[0]?.image_uris?.normal"
        :alt="selectedCard.name"
        class="w-24 rounded-lg"
      />
      <div class="flex-1 text-sm space-y-1">
        <p class="font-semibold">{{ selectedCard.name }}</p>
        <p class="text-vault-muted text-xs">{{ selectedCard.type_line }}</p>
        <p class="text-vault-muted text-xs">{{ selectedCard.set_name }}</p>
        <p v-if="selectedCard.prices?.usd" class="text-vault-gold text-xs">${{ selectedCard.prices.usd }}</p>
      </div>
    </div>

    <!-- Quantity row -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-sm text-vault-muted mb-1 block">Qty (Normal)</label>
        <InputNumber v-model="form.quantity" :min="0" :max="99" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-vault-muted mb-1 block">Qty (Foil)</label>
        <InputNumber v-model="form.foilQuantity" :min="0" :max="99" class="w-full" />
      </div>
    </div>

    <!-- Condition & Language -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-sm text-vault-muted mb-1 block">Condition</label>
        <Select v-model="form.condition" :options="CONDITIONS" option-label="label" option-value="value" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-vault-muted mb-1 block">Language</label>
        <Select v-model="form.language" :options="LANGUAGES" option-label="label" option-value="value" class="w-full" />
      </div>
    </div>

    <!-- Storage & Tags -->
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Storage Location</label>
      <InputText v-model="form.storage" placeholder="e.g. Binder A, Box 1" class="w-full" />
    </div>

    <!-- Proxy toggle -->
    <div class="flex items-center gap-3">
      <ToggleSwitch v-model="form.isProxy" />
      <span class="text-sm text-vault-muted">This is a proxy</span>
    </div>

    <!-- Notes -->
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Notes</label>
      <Textarea v-model="form.notes" rows="2" class="w-full" placeholder="Optional notes…" />
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-2 border-t border-vault-border">
      <Button label="Cancel" outlined @click="$emit('close')" />
      <Button label="Add to Collection" :disabled="!selectedCard" @click="save" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScryfall } from '~/composables/useScryfall'
import { useCollection } from '~/composables/useCollection'
import type { ScryfallCard, CardCondition, CardLanguage } from '~/types'

const emit = defineEmits<{ saved: []; close: [] }>()

const { autocomplete, getCardByName } = useScryfall()
const { addCard } = useCollection()

const searchQuery = ref('')
const suggestions = ref<string[]>([])
const selectedCard = ref<ScryfallCard | null>(null)

const form = reactive({
  quantity: 1,
  foilQuantity: 0,
  condition: 'NM' as CardCondition,
  language: 'en' as CardLanguage,
  storage: '',
  isProxy: false,
  notes: '',
})

const CONDITIONS = [
  { label: 'Near Mint (NM)',      value: 'NM' },
  { label: 'Lightly Played (LP)', value: 'LP' },
  { label: 'Moderately Played (MP)', value: 'MP' },
  { label: 'Heavily Played (HP)', value: 'HP' },
  { label: 'Damaged (DMG)',        value: 'DMG' },
]

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'German',  value: 'de' },
  { label: 'French',  value: 'fr' },
  { label: 'Italian', value: 'it' },
  { label: 'Spanish', value: 'es' },
  { label: 'Japanese',value: 'ja' },
  { label: 'Korean',  value: 'ko' },
  { label: 'Russian', value: 'ru' },
]

async function onComplete(event: { query: string }) {
  suggestions.value = await autocomplete(event.query)
}

async function onSelect(event: { value: string }) {
  selectedCard.value = await getCardByName(event.value)
}

async function save() {
  if (!selectedCard.value) return
  await addCard({
    scryfallId: selectedCard.value.id,
    quantity: form.quantity,
    foilQuantity: form.foilQuantity,
    condition: form.condition,
    language: form.language,
    storage: form.storage || undefined,
    isProxy: form.isProxy,
    isCustom: false,
    notes: form.notes || undefined,
    tags: [],
    deckIds: [],
  })
  emit('saved')
}
</script>
