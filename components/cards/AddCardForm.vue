<template>
  <div class="space-y-4">
    <!-- Card search -->
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Card Name</label>
      <AutoComplete
        v-model="searchQuery"
        :suggestions="suggestions"
        option-label="name"
        placeholder="Search Scryfall…"
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
              class="w-10 h-14 rounded object-cover shrink-0"
              loading="lazy"
            />
            <div v-else class="w-10 h-14 rounded bg-vault-surface3 shrink-0 flex items-center justify-center text-vault-dim text-xs">?</div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-vault-text truncate">{{ option.name }}</p>
              <p class="text-xs text-vault-muted truncate">{{ option.type_line }}</p>
              <p class="text-xs text-vault-dim truncate">{{ option.set_name }}</p>
            </div>
            <span v-if="option.prices?.usd" class="text-xs text-vault-gold font-medium shrink-0">${{ option.prices.usd }}</span>
          </div>
        </template>
      </AutoComplete>
    </div>

    <!-- Printing / Set picker -->
    <div v-if="selectedCard">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm text-vault-muted">Printing / Set</label>
        <button
          v-if="!prints.length && !loadingPrints"
          class="text-xs text-vault-accent hover:underline"
          @click="loadPrints"
        >
          Load all printings
        </button>
        <span v-if="loadingPrints" class="text-xs text-vault-muted">Loading…</span>
      </div>

      <!-- Selected printing preview -->
      <div class="flex gap-4 p-3 bg-vault-surface2 rounded-xl animate-slide-up">
        <img
          :src="selectedCard.image_uris?.normal ?? selectedCard.card_faces?.[0]?.image_uris?.normal"
          :alt="selectedCard.name"
          class="w-20 rounded-lg shrink-0"
        />
        <div class="flex-1 text-sm space-y-1 min-w-0">
          <p class="font-semibold truncate">{{ selectedCard.name }}</p>
          <p class="text-vault-muted text-xs">{{ selectedCard.type_line }}</p>
          <p class="text-vault-muted text-xs font-medium">{{ selectedCard.set_name }} · #{{ selectedCard.collector_number }}</p>
          <p v-if="selectedCard.prices?.usd" class="text-vault-gold text-xs">${{ selectedCard.prices.usd }}</p>
        </div>
      </div>

      <!-- Printing list -->
      <div v-if="prints.length" class="mt-2 max-h-40 overflow-y-auto space-y-1 pr-1">
        <button
          v-for="print in prints"
          :key="print.id"
          class="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors"
          :class="selectedCard.id === print.id ? 'bg-vault-accent/10 border border-vault-accent/30' : 'hover:bg-vault-surface2'"
          @click="selectedCard = print"
        >
          <img
            v-if="print.image_uris?.small ?? print.card_faces?.[0]?.image_uris?.small"
            :src="print.image_uris?.small ?? print.card_faces?.[0]?.image_uris?.small"
            class="w-7 h-10 object-cover rounded shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium truncate">{{ print.set_name }}</p>
            <p class="text-[11px] text-vault-muted">#{{ print.collector_number }} · {{ print.released_at?.slice(0, 4) }}</p>
          </div>
          <span v-if="print.prices?.usd" class="text-[11px] text-vault-gold shrink-0">${{ print.prices.usd }}</span>
        </button>
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

    <!-- Storage -->
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

const { autocompleteCards, getPrints } = useScryfall()
const { addCard } = useCollection()

const searchQuery = ref<string | ScryfallCard>('')
const suggestions = ref<ScryfallCard[]>([])
const selectedCard = ref<ScryfallCard | null>(null)
const prints = ref<ScryfallCard[]>([])
const loadingPrints = ref(false)

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
  { label: 'Near Mint (NM)',         value: 'NM' },
  { label: 'Lightly Played (LP)',    value: 'LP' },
  { label: 'Moderately Played (MP)', value: 'MP' },
  { label: 'Heavily Played (HP)',    value: 'HP' },
  { label: 'Damaged (DMG)',          value: 'DMG' },
]

const LANGUAGES = [
  { label: 'English',  value: 'en' },
  { label: 'German',   value: 'de' },
  { label: 'French',   value: 'fr' },
  { label: 'Italian',  value: 'it' },
  { label: 'Spanish',  value: 'es' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean',   value: 'ko' },
  { label: 'Russian',  value: 'ru' },
]

async function onComplete(event: { query: string }) {
  suggestions.value = await autocompleteCards(event.query)
}

function onSelect(event: { value: ScryfallCard }) {
  selectedCard.value = event.value
  searchQuery.value = event.value.name
  prints.value = []
  // Auto-load printings
  loadPrints()
}

async function loadPrints() {
  if (!selectedCard.value?.oracle_id) return
  loadingPrints.value = true
  try {
    prints.value = await getPrints(selectedCard.value.oracle_id)
  } finally {
    loadingPrints.value = false
  }
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
