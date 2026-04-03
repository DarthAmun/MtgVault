<template>
  <div class="space-y-4">
    <div>
      <label class="text-sm text-vault-muted mb-1 block">Paste your card list</label>
      <p class="text-xs text-vault-dim mb-2">Supports standard formats: "4 Lightning Bolt", "4x Lightning Bolt (M11)", "4 *F* Bolt"</p>
      <Textarea
        v-model="rawText"
        rows="10"
        class="w-full font-mono text-xs"
        placeholder="4 Lightning Bolt&#10;2x Black Lotus (LEA)&#10;1 *F* Thoughtseize (THS) 107"
      />
    </div>

    <!-- Parsed preview -->
    <div v-if="parsed.length" class="vault-card p-3 max-h-48 overflow-y-auto">
      <p class="text-xs text-vault-muted mb-2">Parsed {{ parsed.length }} lines</p>
      <div
        v-for="(line, i) in parsed.slice(0, 20)"
        :key="i"
        class="flex items-center gap-2 text-xs py-1 border-b border-vault-border/50"
      >
        <span class="text-vault-gold font-mono w-4">{{ line.quantity }}</span>
        <span v-if="line.foil" class="text-vault-gold text-[10px]">FOIL</span>
        <span class="flex-1">{{ line.name }}</span>
        <span v-if="line.set" class="text-vault-dim uppercase">{{ line.set }}</span>
      </div>
      <p v-if="parsed.length > 20" class="text-vault-dim text-xs mt-1">…and {{ parsed.length - 20 }} more</p>
    </div>

    <!-- Progress -->
    <div v-if="importing" class="space-y-2">
      <ProgressBar :value="progress" />
      <p class="text-xs text-vault-muted text-center">{{ progressMsg }}</p>
    </div>

    <div class="flex justify-end gap-2 pt-2 border-t border-vault-border">
      <Button label="Cancel" outlined @click="$emit('close')" :disabled="importing" />
      <Button
        :label="importing ? 'Importing…' : `Import ${parsed.length} cards`"
        :disabled="!parsed.length || importing"
        @click="startImport"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCollection } from '~/composables/useCollection'
import { useScryfall } from '~/composables/useScryfall'

const emit = defineEmits<{ done: []; close: [] }>()

const { parseTextList, addCard } = useCollection()
const { getCardByName } = useScryfall()

const rawText = ref('')
const importing = ref(false)
const progress = ref(0)
const progressMsg = ref('')

const parsed = computed(() => {
  if (!rawText.value.trim()) return []
  return parseTextList(rawText.value)
})

async function startImport() {
  if (!parsed.value.length) return
  importing.value = true
  progress.value = 0

  let done = 0
  for (const line of parsed.value) {
    progressMsg.value = `Looking up "${line.name}"…`
    const card = await getCardByName(line.name, line.set)
    if (card) {
      await addCard({
        scryfallId: card.id,
        quantity: line.foil ? 0 : line.quantity,
        foilQuantity: line.foil ? line.quantity : 0,
        condition: 'NM',
        language: 'en',
        isProxy: false,
        isCustom: false,
        tags: [],
        deckIds: [],
      })
    }
    done++
    progress.value = Math.round((done / parsed.value.length) * 100)
  }

  importing.value = false
  emit('done')
}
</script>
