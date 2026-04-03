<template>
  <div>
    <span class="text-vault-dim text-xs">{{ label }}</span>
    <p class="text-vault-text text-sm font-medium">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number }>()
</script>
