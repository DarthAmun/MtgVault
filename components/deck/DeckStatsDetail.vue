<template>
  <div class="space-y-6 p-2">
    <!-- Overview row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="vault-card p-3 text-center">
        <p class="text-xl font-bold text-vault-text">{{ stats.cardCount }}</p>
        <p class="text-xs text-vault-muted">Total Cards</p>
      </div>
      <div class="vault-card p-3 text-center">
        <p class="text-xl font-bold text-vault-text">{{ stats.avgManaValue.toFixed(2) }}</p>
        <p class="text-xs text-vault-muted">Avg Mana Value</p>
      </div>
      <div class="vault-card p-3 text-center">
        <p class="text-xl font-bold text-vault-gold">${{ stats.estimatedValue.toFixed(2) }}</p>
        <p class="text-xs text-vault-muted">Est. Value</p>
      </div>
      <div class="vault-card p-3 text-center">
        <p class="text-xl font-bold" :class="stats.missingCards.length ? 'text-amber-400' : 'text-emerald-400'">
          {{ stats.missingCards.length }}
        </p>
        <p class="text-xs text-vault-muted">Missing</p>
      </div>
    </div>

    <!-- Mana curve -->
    <div class="vault-card p-4">
      <h3 class="font-display text-vault-text mb-4">Mana Curve</h3>
      <div class="flex items-end gap-2 h-32">
        <div
          v-for="[cmc, count] in manaCurveEntries"
          :key="cmc"
          class="flex-1 flex flex-col items-center gap-1"
        >
          <span class="text-xs text-vault-muted">{{ count }}</span>
          <div
            class="w-full rounded-t-sm bg-vault-accent transition-all duration-700"
            :style="{ height: `${maxCurve ? (count / maxCurve) * 96 : 0}px` }"
          />
          <span class="text-xs text-vault-dim">{{ cmc }}{{ Number(cmc) >= 7 ? '+' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Type breakdown -->
    <div class="vault-card p-4">
      <h3 class="font-display text-vault-text mb-4">Card Types</h3>
      <div class="space-y-2">
        <div v-for="[type, count] in typeEntries" :key="type" class="flex items-center gap-3">
          <span class="text-sm text-vault-muted w-24 shrink-0">{{ type }}</span>
          <div class="flex-1 h-2 bg-vault-surface3 rounded-full overflow-hidden">
            <div
              class="h-full bg-vault-accent/70 rounded-full"
              :style="{ width: `${maxType ? (count / maxType) * 100 : 0}%` }"
            />
          </div>
          <span class="text-xs text-vault-muted w-6 text-right shrink-0">{{ count }}</span>
        </div>
      </div>
    </div>

    <!-- Color distribution -->
    <div class="vault-card p-4">
      <h3 class="font-display text-vault-text mb-4">Color Distribution</h3>
      <ColorDistributionChart :data="colorData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeckStats } from '~/types'

const props = defineProps<{ stats: DeckStats }>()

const manaCurveEntries = computed(() => {
  const curve: Record<number, number> = {}
  for (let i = 0; i <= 7; i++) curve[i] = 0
  for (const [cmc, count] of Object.entries(props.stats.manaCurve)) {
    const key = Math.min(Number(cmc), 7)
    curve[key] = (curve[key] ?? 0) + count
  }
  return Object.entries(curve).sort((a, b) => Number(a[0]) - Number(b[0]))
})

const maxCurve = computed(() =>
  Math.max(...manaCurveEntries.value.map(([, c]) => c), 1)
)

const typeEntries = computed(() =>
  Object.entries(props.stats.typeBreakdown).sort((a, b) => b[1] - a[1])
)

const maxType = computed(() =>
  Math.max(...typeEntries.value.map(([, c]) => c), 1)
)

const colorData = computed(() =>
  Object.fromEntries(
    Object.entries(props.stats.colorDistribution).map(([k, v]) => [k, v])
  )
)
</script>
