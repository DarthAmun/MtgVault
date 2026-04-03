<template>
  <div
    class="vault-card p-4 cursor-pointer flex flex-col gap-3 group"
    @click="$emit('click')"
  >
    <!-- Cover art -->
    <div class="relative h-28 rounded-lg overflow-hidden bg-vault-surface2">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="deck.name"
        class="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <v-icon name="fa-book" scale="2" class="text-vault-dim" />
      </div>

      <!-- Color pips overlay -->
      <div class="absolute bottom-2 left-2 flex gap-1">
        <span
          v-for="color in deck.colorIdentity"
          :key="color"
          class="color-pip"
          :class="`mana-${color}`"
        />
      </div>

      <!-- Format badge -->
      <span class="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/80 uppercase">
        {{ deck.format }}
      </span>
    </div>

    <!-- Info -->
    <div>
      <h3 class="font-display text-vault-text font-semibold text-sm truncate">{{ deck.name }}</h3>
      <p class="text-xs text-vault-muted mt-0.5">{{ totalCards }} cards · updated {{ relativeDate }}</p>
    </div>

    <!-- Tags -->
    <div v-if="deck.tags.length" class="flex flex-wrap gap-1">
      <span
        v-for="tag in deck.tags.slice(0, 3)"
        :key="tag"
        class="text-[10px] px-1.5 py-0.5 rounded bg-vault-surface3 text-vault-muted"
      >
        {{ tag }}
      </span>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mt-1">
      <button
        class="p-1.5 rounded text-vault-muted hover:text-red-400 transition-colors text-xs"
        @click.stop="$emit('delete')"
      >
        <v-icon name="fa-trash" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import type { Deck } from '~/types'

const props = defineProps<{ deck: Deck }>()
defineEmits<{ click: []; delete: [] }>()

const coverImage = ref<string | undefined>()

const totalCards = computed(() =>
  props.deck.cards.reduce((s, c) => s + c.quantity, 0)
)

const relativeDate = computed(() => {
  const diff = Date.now() - new Date(props.deck.updatedAt).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
})

onMounted(async () => {
  if (props.deck.coverScryfallId) {
    const card = await db.scryfallCards.get(props.deck.coverScryfallId)
    coverImage.value = card?.image_uris?.art_crop ?? card?.card_faces?.[0]?.image_uris?.art_crop
  }
})
</script>
