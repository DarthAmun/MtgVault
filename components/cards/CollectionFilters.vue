<template>
  <div class="vault-card p-4 flex flex-wrap gap-3 items-end">
    <!-- Search -->
    <div class="flex-1 min-w-48">
      <label class="text-xs text-vault-muted mb-1 block">Search</label>
      <IconField>
        <InputIcon><v-icon name="fa-search" /></InputIcon>
        <InputText
          :model-value="modelValue.search"
          placeholder="Name, type, text…"
          class="w-full"
          @update:model-value="emit('update:modelValue', { ...modelValue, search: $event })"
        />
      </IconField>
    </div>

    <!-- Colors -->
    <div>
      <label class="text-xs text-vault-muted mb-1 block">Colors</label>
      <div class="flex gap-1.5">
        <button
          v-for="color in COLORS"
          :key="color.code"
          class="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
          :class="modelValue.colors.includes(color.code)
            ? 'border-vault-text scale-110 shadow-md'
            : 'border-transparent opacity-60 hover:opacity-100'"
          :style="{ background: color.hex }"
          :title="color.label"
          @click="toggleColor(color.code)"
        >
          <img
            v-if="svgUrl(color.code)"
            :src="svgUrl(color.code)"
            :alt="color.code"
            class="w-5 h-5"
            style="filter: brightness(0) invert(1);"
            draggable="false"
          />
          <span v-else class="text-[10px] font-bold text-white">{{ color.code }}</span>
        </button>
      </div>
    </div>

    <!-- Rarity -->
    <div class="min-w-32">
      <label class="text-xs text-vault-muted mb-1 block">Rarity</label>
      <Select
        :model-value="modelValue.rarity"
        :options="RARITIES"
        option-label="label"
        option-value="value"
        placeholder="Any"
        class="w-full"
        @update:model-value="emit('update:modelValue', { ...modelValue, rarity: $event })"
      />
    </div>

    <!-- Clear -->
    <button
      class="px-3 py-2 text-sm text-vault-muted hover:text-vault-text transition-colors"
      @click="clear"
    >
      <v-icon name="fa-times" class="mr-1" />Clear
    </button>
  </div>
</template>

<script setup lang="ts">
const svgModules = import.meta.glob('../../assets/svgs/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function svgUrl(code: string): string | undefined {
  const key = `../../assets/svgs/${code.toLowerCase()}.svg`
  return svgModules[key] || undefined
}

const props = defineProps<{
  modelValue: { search: string; colors: string[]; rarity: string; set: string; onlyOwned: boolean }
}>()

const emit = defineEmits<{
  'update:modelValue': [typeof props.modelValue]
}>()

const COLORS = [
  { code: 'W', hex: '#c8b96a', label: 'White' },
  { code: 'U', hex: '#0e68ab', label: 'Blue' },
  { code: 'B', hex: '#3a3450', label: 'Black' },
  { code: 'R', hex: '#d3202a', label: 'Red' },
  { code: 'G', hex: '#00733e', label: 'Green' },
]

const RARITIES = [
  { label: 'Any', value: '' },
  { label: 'Common',   value: 'common' },
  { label: 'Uncommon', value: 'uncommon' },
  { label: 'Rare',     value: 'rare' },
  { label: 'Mythic',   value: 'mythic' },
]

function toggleColor(code: string) {
  const colors = props.modelValue.colors.includes(code)
    ? props.modelValue.colors.filter(c => c !== code)
    : [...props.modelValue.colors, code]
  emit('update:modelValue', { ...props.modelValue, colors })
}

function clear() {
  emit('update:modelValue', { search: '', colors: [], rarity: '', set: '', onlyOwned: false })
}
</script>
