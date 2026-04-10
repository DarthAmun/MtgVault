<template>
  <div class="p-4 md:p-6 space-y-6">
    <div>
      <h1 class="font-display text-3xl text-vault-gold">Game Tools</h1>
      <p class="text-vault-muted text-sm mt-1">Utilities for your game night</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.to"
        :to="tool.to"
        class="vault-card group flex flex-col items-center text-center p-5 gap-3 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 no-underline"
      >
        <div
          class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-110"
          :style="`background: linear-gradient(135deg, ${tool.color1}, ${tool.color2});`"
        >
          <v-icon :name="tool.icon" scale="1.6" class="text-white" />
        </div>
        <div>
          <p class="font-display font-bold text-vault-text text-sm leading-snug">{{ tool.name }}</p>
          <p class="text-vault-muted text-xs mt-1 leading-snug">{{ tool.description }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const tools = [
  {
    to: '/game-tools/life',
    name: 'Life Counter',
    description: 'Track life totals & commander damage for 2–6 players',
    icon: 'fa-heart',
    color1: '#7c3aed',
    color2: '#db2777',
  },
  {
    to: '/game-tools/horde',
    name: 'Against the Horde',
    description: 'Cooperative mode — survivors vs. an automated zombie horde deck',
    icon: 'fa-skull',
    color1: '#1a1a2e',
    color2: '#6b21a8',
  },
  {
    to: '/game-tools/commander-party',
    name: 'Commander Party',
    description: 'Upload and view commander party materials during your game',
    icon: 'fa-layer-group',
    color1: '#0369a1',
    color2: '#0891b2',
  },
  {
    to: '/game-tools/pve',
    name: 'Big Bad PvE',
    description: 'Co-op PvE mode — display and track the big bad\'s board state',
    icon: 'fa-dragon',
    color1: '#b45309',
    color2: '#dc2626',
  },
]
</script>
