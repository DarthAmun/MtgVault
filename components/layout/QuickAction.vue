<template>
  <NuxtLink
    :to="to"
    class="vault-card p-4 flex flex-col items-center gap-2.5 text-center cursor-pointer group transition-all hover:-translate-y-0.5"
  >
    <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
         style="background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(147,51,234,0.08));">
      <v-icon :name="icon" class="text-vault-accent" />
    </div>
    <span class="text-xs font-medium text-vault-muted group-hover:text-vault-text transition-colors">{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{ to: string; icon: string; label: string }>()
</script>
