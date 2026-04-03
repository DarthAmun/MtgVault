<template>
  <div class="p-6 space-y-8">
    <div>
      <h1 class="font-display text-3xl text-vault-gold">Statistics</h1>
      <p class="text-vault-muted text-sm mt-1">Deep dive into your collection</p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <v-icon name="fa-spinner" scale="2" class="animate-spin text-vault-accent" />
    </div>

    <template v-else-if="stats">
      <!-- Top row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cards"   :value="stats.totalCards"   icon="fa-th-large"    color="accent" />
        <StatCard label="Unique Cards"  :value="stats.uniqueCards"  icon="fa-list"        color="gold" />
        <StatCard label="Foil Copies"   :value="stats.totalFoils"   icon="fa-star"        color="purple" />
        <StatCard label="Est. Value"    :value="`$${stats.totalValue.toFixed(2)}`" icon="fa-dollar-sign" color="green" />
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Rarity breakdown -->
        <div class="vault-card p-5">
          <h2 class="font-display text-lg text-vault-text mb-4">Rarity Breakdown</h2>
          <div class="space-y-3">
            <div v-for="r in RARITIES" :key="r.key" class="flex items-center gap-3">
              <span :class="`rarity-${r.key} text-xs font-bold w-20 shrink-0 capitalize`">{{ r.label }}</span>
              <div class="flex-1 h-2.5 bg-vault-surface3 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :style="{ width: `${maxRarity ? (stats.byRarity[r.key] / maxRarity) * 100 : 0}%`, background: r.color }"
                />
              </div>
              <span class="text-xs text-vault-muted w-12 text-right shrink-0">{{ stats.byRarity[r.key] ?? 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Color Distribution -->
        <div class="vault-card p-5">
          <h2 class="font-display text-lg text-vault-text mb-4">Color Identity</h2>
          <ColorDistributionChart :data="stats.byColor" />
        </div>
      </div>

      <!-- Type Breakdown -->
      <div class="vault-card p-5">
        <h2 class="font-display text-lg text-vault-text mb-4">Card Types</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            v-for="[type, count] in topTypes"
            :key="type"
            class="vault-card p-3 text-center"
          >
            <p class="text-2xl font-bold text-vault-text">{{ count }}</p>
            <p class="text-xs text-vault-muted mt-1">{{ type }}</p>
          </div>
        </div>
      </div>

      <!-- Top Sets -->
      <div class="vault-card p-5">
        <h2 class="font-display text-lg text-vault-text mb-4">Top Sets</h2>
        <div class="space-y-2">
          <div
            v-for="s in stats.bySet.slice(0, 15)"
            :key="s.set"
            class="flex items-center gap-3"
          >
            <span class="text-xs font-mono text-vault-gold uppercase w-10 shrink-0">{{ s.set }}</span>
            <span class="text-sm text-vault-muted flex-1 truncate">{{ s.setName }}</span>
            <div class="w-32 h-1.5 bg-vault-surface3 rounded-full overflow-hidden">
              <div
                class="h-full bg-vault-accent rounded-full"
                :style="{ width: `${(s.count / stats.bySet[0].count) * 100}%` }"
              />
            </div>
            <span class="text-xs text-vault-muted w-10 text-right shrink-0">{{ s.count }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useStats } from '~/composables/useStats'
import type { CollectionStats, Rarity } from '~/types'

const { getCollectionStats } = useStats()
const stats = ref<CollectionStats | null>(null)
const loading = ref(true)

const RARITIES: { key: Rarity; label: string; color: string }[] = [
  { key: 'mythic',   label: 'Mythic',   color: '#e7792b' },
  { key: 'rare',     label: 'Rare',     color: '#c6a744' },
  { key: 'uncommon', label: 'Uncommon', color: '#c0c8d8' },
  { key: 'common',   label: 'Common',   color: '#c8c8c8' },
]

const maxRarity = computed(() =>
  stats.value ? Math.max(...RARITIES.map(r => stats.value!.byRarity[r.key] ?? 0), 1) : 1
)

const topTypes = computed(() => {
  if (!stats.value) return []
  return Object.entries(stats.value.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
})

onMounted(async () => {
  stats.value = await getCollectionStats()
  loading.value = false
})
</script>
