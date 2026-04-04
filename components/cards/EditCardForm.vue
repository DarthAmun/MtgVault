<template>
  <div class="space-y-4">
    <!-- Card identity (read-only) -->
    <div class="flex gap-4 p-3 bg-vault-surface2 rounded-xl">
      <img
        v-if="imageUri"
        :src="imageUri"
        :alt="card?.name"
        class="w-20 rounded-lg shrink-0"
      />
      <div class="flex-1 text-sm space-y-1 min-w-0">
        <p class="font-semibold truncate">{{ card?.name }}</p>
        <p class="text-vault-muted text-xs">{{ card?.type_line }}</p>
        <p class="text-vault-muted text-xs">{{ card?.set_name }}</p>
        <p v-if="card?.prices?.usd" class="text-vault-gold text-xs">${{ card.prices.usd }}</p>
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
    <div class="flex items-center gap-2 pt-2 border-t border-vault-border">
      <Button label="Delete" severity="danger" outlined class="mr-auto" @click="remove">
        <template #icon><v-icon name="fa-trash" class="mr-2" /></template>
      </Button>
      <Button label="Cancel" outlined @click="$emit('close')" />
      <Button label="Save" @click="save" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCollection } from '~/composables/useCollection'
import type { CollectionEntry, ScryfallCard, CardCondition, CardLanguage } from '~/types'

const props = defineProps<{
  entry: CollectionEntry
  card?: ScryfallCard
}>()

const emit = defineEmits<{ saved: []; close: []; deleted: [] }>()

const { updateCard, removeCard } = useCollection()

const imageUri = computed(() =>
  props.card?.image_uris?.normal ??
  props.card?.card_faces?.[0]?.image_uris?.normal
)

const form = reactive({
  quantity: props.entry.quantity,
  foilQuantity: props.entry.foilQuantity ?? 0,
  condition: props.entry.condition,
  language: props.entry.language,
  storage: props.entry.storage ?? '',
  isProxy: props.entry.isProxy,
  notes: props.entry.notes ?? '',
})

const CONDITIONS = [
  { label: 'Near Mint (NM)',        value: 'NM' },
  { label: 'Lightly Played (LP)',   value: 'LP' },
  { label: 'Moderately Played (MP)', value: 'MP' },
  { label: 'Heavily Played (HP)',   value: 'HP' },
  { label: 'Damaged (DMG)',         value: 'DMG' },
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

async function save() {
  await updateCard(props.entry.id, {
    quantity: form.quantity,
    foilQuantity: form.foilQuantity,
    condition: form.condition as CardCondition,
    language: form.language as CardLanguage,
    storage: form.storage || undefined,
    isProxy: form.isProxy,
    notes: form.notes || undefined,
  })
  emit('saved')
}

async function remove() {
  if (!confirm(`Remove ${props.card?.name ?? 'this card'} from your collection?`)) return
  await removeCard(props.entry.id)
  emit('deleted')
}
</script>
