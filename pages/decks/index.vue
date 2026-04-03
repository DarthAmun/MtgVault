<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl text-vault-gold">Decks</h1>
        <p class="text-vault-muted text-sm mt-1">{{ decks.length }} decks</p>
      </div>
      <Button label="New Deck" @click="showNew = true">
        <template #icon><v-icon name="fa-plus" class="mr-2" /></template>
      </Button>
    </div>

    <!-- Deck grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <DeckCard
        v-for="deck in decks"
        :key="deck.id"
        :deck="deck"
        @click="navigateTo(`/decks/${deck.id}`)"
        @delete="deleteDeck(deck.id)"
      />
    </div>

    <div v-if="!decks.length" class="text-center py-20 text-vault-muted">
      <v-icon name="fa-book" scale="2" class="mb-3" />
      <p>No decks yet. Create your first one!</p>
    </div>

    <!-- New Deck Dialog -->
    <Dialog v-model:visible="showNew" modal header="New Deck" class="w-full max-w-md">
      <NewDeckForm @created="onCreated" @close="showNew = false" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import type { Deck } from '~/types'

const { getAll, deleteDeck: deleteDeckFn } = useDecks()
const decks = ref<Deck[]>([])
const showNew = ref(false)

async function load() {
  decks.value = await getAll()
}

async function deleteDeck(id: string) {
  await deleteDeckFn(id)
  await load()
}

async function onCreated(id: string) {
  showNew.value = false
  await navigateTo(`/decks/${id}`)
}

onMounted(load)
</script>
