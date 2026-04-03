<template>
  <div class="space-y-4">
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Deck Name</label>
      <InputText v-model="form.name" placeholder="My Commander Deck" class="w-full" />
    </div>
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Format</label>
      <Select v-model="form.format" :options="FORMATS" class="w-full" />
    </div>
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Description</label>
      <Textarea v-model="form.description" rows="3" class="w-full" placeholder="What's the strategy?" />
    </div>
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Import Deck List (optional)</label>
      <Textarea v-model="form.deckList" rows="6" class="w-full font-mono text-xs" placeholder="1 Sol Ring&#10;4 Lightning Bolt&#10;…" />
    </div>
    <div class="flex justify-end gap-2 pt-2 border-t border-vault-border">
      <Button label="Cancel" outlined @click="$emit('close')" />
      <Button label="Create Deck" :disabled="!form.name" @click="create" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import { useScryfall } from '~/composables/useScryfall'

const emit = defineEmits<{ created: [id: string]; close: [] }>()
const { createDeck, parseDeckList, addCardToDeck } = useDecks()
const { getCardByName } = useScryfall()

const FORMATS = [
  'commander', 'standard', 'pioneer', 'modern', 'legacy',
  'vintage', 'pauper', 'brawl', 'oathbreaker', 'other',
]

const form = reactive({
  name: '',
  format: 'commander',
  description: '',
  deckList: '',
})

async function create() {
  const id = await createDeck({
    name: form.name,
    format: form.format,
    description: form.description,
    cards: [],
    tags: [],
    colorIdentity: [],
    isArchived: false,
    notes: '',
  })

  if (form.deckList.trim()) {
    const lines = parseDeckList(form.deckList)
    for (const line of lines) {
      const card = await getCardByName(line.name)
      if (card) {
        await addCardToDeck(id, {
          scryfallId: card.id,
          quantity: line.quantity,
          isSideboard: line.isSideboard,
          isCommander: line.isCommander,
          isCompanion: false,
        })
      }
    }
  }

  emit('created', id)
}
</script>
