<template>
  <div class="p-4 md:p-6 space-y-6 md:space-y-8 animate-slide-up">
    <!-- Header -->
    <div>
      <h1 class="font-display text-3xl text-vault-gold">The Vault</h1>
      <p class="text-vault-muted mt-1">Your Magic: The Gathering collection at a glance</p>
    </div>

    <!-- Quick stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Cards"
        :value="stats?.totalCards ?? '—'"
        icon="fa-th-large"
        color="accent"
      />
      <StatCard
        label="Unique Cards"
        :value="stats?.uniqueCards ?? '—'"
        icon="fa-list"
        color="gold"
      />
      <StatCard
        label="Decks"
        :value="stats?.totalDecks ?? '—'"
        icon="fa-book"
        color="purple"
      />
      <StatCard
        label="Est. Value"
        :value="stats ? `$${stats.totalValue.toFixed(2)}` : '—'"
        icon="fa-dollar-sign"
        color="green"
      />
    </div>

    <!-- Two-column layout -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recently Added -->
      <div class="vault-card p-5">
        <h2 class="font-display text-base font-semibold mb-4" style="color: #1e1a2e;">Recently Added</h2>
        <div v-if="recentCards.length" class="space-y-1">
          <div
            v-for="item in recentCards"
            :key="item.entry.id"
            class="flex items-center gap-3 p-2 rounded-xl hover:bg-violet-50 transition-colors cursor-pointer"
          >
            <img
              v-if="item.card?.image_uris?.small"
              :src="item.card.image_uris.small"
              :alt="item.card.name"
              class="w-9 h-[52px] object-cover rounded-lg shadow-sm"
              loading="lazy"
            />
            <div v-else class="w-9 h-[52px] rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <v-icon name="fa-image" class="text-violet-300" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate" style="color: #1e1a2e;">{{ item.card?.name ?? item.entry.scryfallId }}</p>
              <p class="text-xs mt-0.5" style="color: #64748b;">{{ item.card?.set_name }} · {{ item.entry.quantity }}×</p>
            </div>
            <span :class="`rarity-${item.card?.rarity} text-xs font-semibold capitalize`">
              {{ item.card?.rarity }}
            </span>
          </div>
        </div>
        <p v-else class="text-sm mt-2" style="color: #64748b;">No cards yet. Add some!</p>
      </div>

      <!-- Color Distribution -->
      <div class="vault-card p-5">
        <h2 class="font-display text-lg text-vault-text mb-4">Color Distribution</h2>
        <ColorDistributionChart :data="stats?.byColor ?? {}" />
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <QuickAction to="/scan"       icon="fa-camera"    label="Scan Cards"    />
      <QuickAction to="/collection" icon="fa-plus"      label="Add Cards"     />
      <QuickAction to="/decks"      icon="fa-book"      label="Build a Deck"  />
      <QuickAction to="/settings"   icon="fa-download"  label="Import Bulk"   />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStats } from '~/composables/useStats'
import { db } from '~/db'
import type { CollectionStats } from '~/types'

const { getCollectionStats } = useStats()

const stats = ref<CollectionStats | null>(null)
const recentCards = ref<any[]>([])

onMounted(async () => {
  stats.value = await getCollectionStats()

  // Enrich recently added
  recentCards.value = await Promise.all(
    (stats.value.recentlyAdded ?? []).map(async entry => ({
      entry,
      card: await db.scryfallCards.get(entry.scryfallId),
    }))
  )
})
</script>
