<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group relative"
    :class="isActive ? 'text-white shadow-accent' : 'text-vault-muted hover:text-vault-text hover:bg-violet-50'"
    :style="isActive
      ? 'background: linear-gradient(135deg, #7c3aed, #9333ea);'
      : ''"
    :title="collapsed ? label : undefined"
  >
    <v-icon
      :name="icon"
      class="shrink-0 transition-transform duration-150"
      :class="isActive ? 'text-white' : 'group-hover:scale-110'"
    />
    <span v-if="!collapsed" class="text-sm font-medium flex-1 truncate">{{ label }}</span>
    <span
      v-if="badge && !collapsed"
      class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      :class="isActive ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-600'"
    >
      {{ badge }}
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  to: string
  icon: string
  label: string
  collapsed?: boolean
  badge?: string
}>()

const route = useRoute()
const isActive = computed(() =>
  props.to === '/' ? route.path === '/' : route.path.startsWith(props.to)
)
</script>
