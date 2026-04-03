<template>
  <div
    class="flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-vault-accent"
    :class="isTop ? 'border-vault-accent/50 bg-vault-accent/5' : 'border-vault-border'"
    @click="$emit('confirm')"
  >
    <img
      v-if="candidate.imageUri"
      :src="candidate.imageUri"
      :alt="candidate.name"
      class="w-12 h-17 object-cover rounded shrink-0"
    />
    <div class="flex-1 min-w-0">
      <p class="font-medium text-sm truncate">{{ candidate.name }}</p>
      <p class="text-xs text-vault-muted">{{ candidate.set }}</p>
    </div>
    <div class="text-right shrink-0">
      <div class="text-sm font-bold" :class="confidenceColor">
        {{ Math.round(candidate.confidence * 100) }}%
      </div>
      <p class="text-xs text-vault-muted">match</p>
    </div>
    <div class="shrink-0">
      <span v-if="isTop" class="text-xs bg-vault-accent/20 text-vault-accent px-2 py-1 rounded">
        Best
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScanCandidate } from '~/types'

const props = defineProps<{ candidate: ScanCandidate; isTop?: boolean }>()
defineEmits<{ confirm: [] }>()

const confidenceColor = computed(() => {
  if (props.candidate.confidence > 0.85) return 'text-emerald-400'
  if (props.candidate.confidence > 0.6) return 'text-yellow-400'
  return 'text-red-400'
})
</script>
