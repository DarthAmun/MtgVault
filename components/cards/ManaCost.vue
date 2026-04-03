<template>
  <span class="inline-flex items-center gap-0.5 flex-wrap">
    <span
      v-for="(symbol, i) in symbols"
      :key="i"
      class="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
      :class="svgSrc(symbol) ? symbolBg(symbol) : symbolFallbackClass(symbol)"
      :title="`{${symbol}}`"
    >
      <img
        v-if="svgSrc(symbol)"
        :src="svgSrc(symbol)"
        :alt="symbol"
        class="w-3.5 h-3.5"
        draggable="false"
      />
      <span v-else class="text-[9px] font-bold leading-none">{{ symbolText(symbol) }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
// Vite resolves these at build time via glob — keys are relative to this file
const svgModules = import.meta.glob('../../assets/svgs/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

// Some symbol names don't match the filename directly
const symFileMap: Record<string, string> = {
  T: 'tap',
  Q: 'untap',
}

function svgSrc(sym: string): string | undefined {
  const upper = sym.toUpperCase().split('/')[0]
  const lower = sym.toLowerCase().split('/')[0]
  const filename = symFileMap[upper] ?? lower
  const key = `../../assets/svgs/${filename}.svg`
  return svgModules[key] || undefined
}

// Background circle color that goes behind the SVG icon
function symbolBg(sym: string): string {
  const s = sym.toUpperCase().split('/')[0]
  const map: Record<string, string> = {
    W: 'bg-[#f5f0dc] border border-[#c8b96a]/40',
    U: 'bg-[#0e68ab]',
    B: 'bg-[#2d2440]',
    R: 'bg-[#d3202a]',
    G: 'bg-[#00733e]',
    C: 'bg-[#b0b2b8]',
    P: 'bg-[#8b1a1a]',
    T: 'bg-slate-100 border border-slate-200',
  }
  return map[s] ?? 'bg-slate-200'
}

// Fallback for symbols without an SVG (numbers, X, hybrid, etc.)
function symbolFallbackClass(sym: string): string {
  if (/^\d+$/.test(sym) || sym === 'X' || sym === 'Y' || sym === 'Z') {
    return 'bg-[#ccc] text-gray-800 border border-black/10'
  }
  return 'bg-slate-300 text-gray-700'
}

function symbolText(sym: string): string {
  const named: Record<string, string> = { Q: '⟲', E: 'ε' }
  return named[sym] ?? sym
}

const props = defineProps<{ cost: string }>()

const symbols = computed(() => {
  if (!props.cost) return []
  return [...props.cost.matchAll(/\{([^}]+)\}/g)].map(m => m[1])
})
</script>
