<template>
  <div class="space-y-3">
    <div v-for="({ color, label, hex, count }) in rows" :key="color" class="flex items-center gap-3">
      <!-- Mana symbol -->
      <div
        class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center border border-black/10"
        :style="{ background: hex }"
      >
        <img
          v-if="svgUrl(color)"
          :src="svgUrl(color)"
          :alt="label"
          class="w-4 h-4"
          style="filter: brightness(0) invert(1);"
          draggable="false"
        />
        <span v-else class="text-[10px] font-bold text-white">{{ color }}</span>
      </div>

      <span class="text-sm text-vault-muted w-16 shrink-0">{{ label }}</span>

      <!-- Bar -->
      <div class="flex-1 h-2.5 bg-vault-surface3 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700"
          :style="{ width: `${max ? (count / max) * 100 : 0}%`, background: hex }"
        />
      </div>

      <span class="text-xs text-vault-muted w-10 text-right shrink-0">{{ count }}</span>
    </div>
    <p v-if="!total" class="text-vault-muted text-sm">No color data yet.</p>
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

const props = defineProps<{ data: Record<string, number> }>()

const COLOR_META: Record<string, { label: string; hex: string }> = {
  W: { label: 'White',     hex: '#c8b96a' },
  U: { label: 'Blue',      hex: '#0e68ab' },
  B: { label: 'Black',     hex: '#3a3450' },
  R: { label: 'Red',       hex: '#d3202a' },
  G: { label: 'Green',     hex: '#00733e' },
  C: { label: 'Colorless', hex: '#9ca3af' },
}

const rows = computed(() =>
  Object.entries(COLOR_META).map(([color, meta]) => ({
    color,
    ...meta,
    count: props.data[color] ?? 0,
  }))
)

const max = computed(() => Math.max(...rows.value.map(r => r.count), 1))
const total = computed(() => rows.value.reduce((s, r) => s + r.count, 0))
</script>
