<template>
  <div class="vault-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
    <div class="text-center">
      <p class="text-2xl font-bold text-vault-text">{{ stats.cardCount }}</p>
      <p class="text-xs text-vault-muted mt-0.5">Cards</p>
    </div>
    <div class="text-center">
      <p class="text-2xl font-bold text-vault-text">{{ stats.avgManaValue.toFixed(1) }}</p>
      <p class="text-xs text-vault-muted mt-0.5">Avg MV</p>
    </div>
    <div class="text-center">
      <p class="text-2xl font-bold" :class="stats.missingCards.length ? 'text-amber-400' : 'text-emerald-400'">
        {{ stats.missingCards.length }}
      </p>
      <p class="text-xs text-vault-muted mt-0.5">Missing</p>
    </div>
    <div class="text-center">
      <p class="text-2xl font-bold text-vault-gold">${{ stats.estimatedValue.toFixed(2) }}</p>
      <p class="text-xs text-vault-muted mt-0.5">Value</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeckStats } from '~/types'
defineProps<{ stats: DeckStats }>()
</script>
