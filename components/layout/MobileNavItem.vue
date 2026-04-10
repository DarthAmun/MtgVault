<template>
  <NuxtLink
    :to="to"
    class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0 flex-1"
    :class="isActive ? 'text-vault-accent' : 'text-vault-muted'"
  >
    <div
      class="w-10 h-7 flex items-center justify-center rounded-xl transition-all"
      :class="isActive ? 'bg-violet-100' : ''"
    >
      <v-icon :name="icon" scale="0.95" />
    </div>
    <span class="text-[9px] font-medium leading-none truncate w-full text-center">{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  to: string
  icon: string
  label: string
}>()

const route = useRoute()
const isActive = computed(() =>
  props.to === '/' ? route.path === '/' : route.path.startsWith(props.to)
)
</script>
