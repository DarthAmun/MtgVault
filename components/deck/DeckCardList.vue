<template>
  <div class="space-y-1">
    <div
      v-for="item in cards"
      :key="item.dc.scryfallId"
      class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-vault-surface2 group transition-colors"
    >
      <!-- Qty -->
      <span class="text-vault-gold font-mono text-sm w-5 shrink-0 text-center">{{ item.dc.quantity }}</span>

      <!-- Name -->
      <span
        class="flex-1 text-sm truncate cursor-pointer hover:text-vault-gold transition-colors"
        :class="item.dc.isCommander ? 'text-vault-gold font-semibold' : 'text-vault-text'"
      >
        {{ item.card?.name ?? item.dc.scryfallId }}
      </span>

      <!-- Mana cost -->
      <ManaCost v-if="item.card?.mana_cost" :cost="item.card.mana_cost" />

      <!-- Commander badge -->
      <span v-if="item.dc.isCommander" class="text-[10px] px-1 py-0.5 rounded bg-vault-gold/20 text-vault-gold shrink-0">
        CMD
      </span>

      <!-- In collection indicator -->
      <span
        class="w-2 h-2 rounded-full shrink-0"
        :class="item.dc.collectionEntryId ? 'bg-emerald-500' : 'bg-vault-dim'"
        :title="item.dc.collectionEntryId ? 'In collection' : 'Not in collection'"
      />

      <!-- Remove -->
      <button
        class="opacity-0 group-hover:opacity-100 transition-opacity text-vault-dim hover:text-red-400 shrink-0"
        @click="remove(item.dc.scryfallId)"
      >
        <v-icon name="fa-times" />
      </button>
    </div>

    <p v-if="!cards.length" class="text-vault-dim text-xs text-center py-4">Empty</p>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import type { ScryfallCard } from '~/types'

const props = defineProps<{
  cards: { dc: any; card?: ScryfallCard }[]
  deckId: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { removeCardFromDeck } = useDecks()

async function remove(scryfallId: string) {
  await removeCardFromDeck(props.deckId, scryfallId)
  emit('changed')
}
</script>
