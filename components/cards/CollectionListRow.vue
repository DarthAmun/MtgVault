<template>
  <div
    class="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-vault-surface2 transition-colors cursor-pointer group"
    @click="$emit('click')"
  >
    <!-- Small thumbnail -->
    <img
      v-if="imageUri"
      :src="imageUri"
      :alt="card?.name"
      class="w-10 h-14 object-cover rounded shrink-0"
      loading="lazy"
    />
    <div v-else class="w-10 h-14 bg-vault-surface2 rounded flex items-center justify-center shrink-0">
      <v-icon name="fa-image" class="text-vault-dim" />
    </div>

    <!-- Name & set -->
    <div class="flex-1 min-w-0">
      <p class="font-medium text-sm truncate">{{ card?.name ?? entry.scryfallId }}</p>
      <p class="text-xs text-vault-muted">{{ card?.type_line }}</p>
      <p class="text-xs text-vault-dim">{{ card?.set_name }} · #{{ card?.collector_number }}</p>
    </div>

    <!-- Mana cost -->
    <div class="hidden sm:flex items-center gap-0.5 shrink-0">
      <ManaCost :cost="card?.mana_cost ?? ''" />
    </div>

    <!-- Rarity -->
    <span :class="`hidden md:block text-xs font-medium capitalize rarity-${card?.rarity} shrink-0`">
      {{ card?.rarity }}
    </span>

    <!-- Condition -->
    <span class="hidden lg:block text-xs px-1.5 py-0.5 rounded bg-vault-surface3 text-vault-muted shrink-0">
      {{ entry.condition }}
    </span>

    <!-- Qty controls -->
    <div class="flex items-center gap-2 shrink-0" @click.stop>
      <span class="text-sm font-semibold w-6 text-center">{{ entry.quantity }}</span>
      <span v-if="(entry.foilQuantity ?? 0) > 0" class="text-xs text-vault-gold">+{{ entry.foilQuantity }}F</span>
    </div>

    <!-- Price -->
    <span class="hidden lg:block text-xs text-vault-muted shrink-0 w-16 text-right">
      {{ card?.prices?.usd ? `$${card.prices.usd}` : '—' }}
    </span>

    <!-- Edit -->
    <button
      class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-vault-muted hover:text-vault-text"
      @click.stop="$emit('edit')"
    >
      <v-icon name="fa-pencil-alt" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CollectionEntry, ScryfallCard } from '~/types'

const props = defineProps<{
  entry: CollectionEntry
  card?: ScryfallCard
}>()

defineEmits<{ click: []; edit: [] }>()

const imageUri = computed(() =>
  props.card?.image_uris?.small ??
  props.card?.card_faces?.[0]?.image_uris?.small
)
</script>
