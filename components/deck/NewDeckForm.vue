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
      <p class="text-xs text-vault-muted mb-1">Supports: <span class="font-mono">1 Sol Ring</span> · <span class="font-mono">1 Baylen, the Haymaker (BLB) 205</span></p>
      <Textarea v-model="form.deckList" rows="6" class="w-full font-mono text-xs" placeholder="1 Sol Ring&#10;1 Atraxa, Praetors' Voice (2X2) 196&#10;…" />
    </div>
    <div v-if="importing" class="space-y-1">
      <ProgressBar :value="importProgress" />
      <p class="text-xs text-vault-muted text-center">{{ importMsg }}</p>
    </div>
    <div class="flex justify-end gap-2 pt-2 border-t border-vault-border">
      <Button label="Cancel" outlined :disabled="importing" @click="$emit('close')" />
      <Button label="Create Deck" :disabled="!form.name || importing" :loading="importing" @click="create" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import { useScryfall } from '~/composables/useScryfall'

const emit = defineEmits<{ created: [id: string]; close: [] }>()
const { createDeck, parseDeckList, addCardToDeck } = useDecks()
const { localGetCardByName, localGetCardBySetAndNumber } = useScryfall()

const FORMATS = [
  'commander', 'standard', 'pioneer', 'modern', 'legacy',
  'vintage', 'pauper', 'brawl', 'oathbreaker', 'horde', 'other',
]

const form = reactive({ name: '', format: 'commander', description: '', deckList: '' })
const importing = ref(false)
const importProgress = ref(0)
const importMsg = ref('')

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
    importing.value = true
    const lines = parseDeckList(form.deckList)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      importProgress.value = Math.round((i / lines.length) * 100)
      importMsg.value = line.name

      let card = (line.set && line.collectorNumber)
        ? await localGetCardBySetAndNumber(line.set, line.collectorNumber)
        : null
      if (!card) card = await localGetCardByName(line.name, line.set)

      if (card) {
        await addCardToDeck(id, {
          scryfallId: card.id,
          quantity: line.quantity,
          isSideboard: line.isSideboard,
          isCommander: line.isCommander,
          isCompanion: false,
          foil: line.foil || undefined,
        })
      }
    }
    importing.value = false
  }

  emit('created', id)
}
</script>
