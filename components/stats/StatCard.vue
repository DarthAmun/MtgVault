<template>
  <div class="vault-card p-5 flex items-center gap-4">
    <div
      class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
      :class="colorClass"
    >
      <v-icon :name="icon" />
    </div>
    <div>
      <p class="text-vault-muted text-xs uppercase tracking-wider font-medium">{{ label }}</p>
      <p class="text-2xl font-bold text-vault-text mt-0.5">{{ value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  value: string | number
  icon: string
  color?: 'accent' | 'gold' | 'purple' | 'green'
}>()

const colorClass = computed(() => ({
  accent: 'bg-violet-100 text-violet-600',
  gold:   'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-600',
  green:  'bg-emerald-100 text-emerald-600',
}[props.color ?? 'accent']))
</script>
