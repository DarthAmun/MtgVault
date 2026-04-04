<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="font-display text-3xl text-vault-gold">Bulk Import</h1>
      <p class="text-vault-muted text-sm mt-1">Paste a card list to add multiple cards at once</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-6 items-start">
      <!-- Input panel -->
      <div class="vault-card p-5 space-y-4">
        <div>
          <label class="text-sm font-medium text-vault-text mb-2 block">Card List</label>
          <p class="text-xs text-vault-muted mb-3">
            One card per line. Supported formats:<br>
            <span class="font-mono text-vault-dim">4 Lightning Bolt</span> ·
            <span class="font-mono text-vault-dim">4x Lightning Bolt</span> ·
            <span class="font-mono text-vault-dim">Lightning Bolt</span>
          </p>
          <Textarea
            v-model="rawInput"
            :rows="16"
            class="w-full font-mono text-sm"
            placeholder="4 Lightning Bolt&#10;2x Counterspell&#10;1 Black Lotus&#10;..."
            :disabled="importing"
          />
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <label class="text-xs text-vault-muted">Default condition</label>
            <Select
              v-model="defaultCondition"
              :options="CONDITIONS"
              option-label="label"
              option-value="value"
              class="text-sm"
            />
          </div>
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="defaultFoil" />
            <label class="text-xs text-vault-muted">Foil</label>
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <Button
            label="Preview"
            outlined
            :disabled="!rawInput.trim() || importing"
            class="flex-1"
            @click="parseList"
          >
            <template #icon><v-icon name="fa-search" class="mr-2" /></template>
          </Button>
          <Button
            label="Import All"
            :disabled="!parsed.length || importing"
            :loading="importing"
            class="flex-1"
            @click="importAll"
          >
            <template #icon><v-icon name="fa-file-import" class="mr-2" /></template>
          </Button>
        </div>
      </div>

      <!-- Preview / results panel -->
      <div class="space-y-4">
        <!-- Progress -->
        <div v-if="importing" class="vault-card p-4 space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-vault-text">Importing…</span>
            <span class="text-vault-muted">{{ doneCount }} / {{ parsed.length }}</span>
          </div>
          <ProgressBar :value="Math.round((doneCount / parsed.length) * 100)" />
          <p class="text-xs text-vault-muted">{{ currentCardName }}</p>
        </div>

        <!-- Done summary -->
        <div v-if="!importing && summary" class="vault-card p-4 space-y-2">
          <div class="flex items-center gap-2">
            <v-icon name="fa-check" class="text-emerald-400" />
            <span class="font-medium text-vault-text text-sm">Import complete</span>
          </div>
          <p class="text-xs text-vault-muted">
            {{ summary.added }} added · {{ summary.notFound }} not found
          </p>
          <div v-if="summary.notFoundNames.length" class="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p class="text-xs font-medium text-amber-400 mb-1">Not found:</p>
            <p
              v-for="name in summary.notFoundNames"
              :key="name"
              class="text-xs text-vault-muted font-mono"
            >{{ name }}</p>
          </div>
          <Button label="Clear" outlined size="small" class="mt-1" @click="reset" />
        </div>

        <!-- Parsed preview -->
        <div v-if="parsed.length && !importing && !summary" class="vault-card p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-vault-text">
              {{ parsed.length }} card{{ parsed.length !== 1 ? 's' : '' }} parsed
            </span>
            <span class="text-xs text-vault-muted">
              {{ parsed.reduce((s, r) => s + r.qty, 0) }} total copies
            </span>
          </div>

          <div class="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            <div
              v-for="(row, i) in parsed"
              :key="i"
              class="flex items-center gap-3 p-2 rounded-lg"
              :class="row.error ? 'bg-red-500/8 border border-red-500/20' : 'bg-vault-surface2'"
            >
              <span class="text-xs font-mono font-bold text-vault-accent w-6 text-right shrink-0">{{ row.qty }}×</span>
              <span class="flex-1 text-sm truncate" :class="row.error ? 'text-red-400' : 'text-vault-text'">
                {{ row.name }}
              </span>
              <span v-if="row.error" class="text-xs text-red-400/70 shrink-0">{{ row.error }}</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!parsed.length && !importing && !summary" class="vault-card p-8 text-center text-vault-muted">
          <v-icon name="fa-file-import" scale="2" class="mb-3 text-vault-dim" />
          <p class="text-sm">Paste a card list and click Preview</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScryfall } from '~/composables/useScryfall'
import { useCollection } from '~/composables/useCollection'
import type { CardCondition } from '~/types'

const { getCardByName } = useScryfall()
const { addCard } = useCollection()

const rawInput = ref('')
const defaultCondition = ref<CardCondition>('NM')
const defaultFoil = ref(false)
const importing = ref(false)
const doneCount = ref(0)
const currentCardName = ref('')
const summary = ref<{ added: number; notFound: number; notFoundNames: string[] } | null>(null)

interface ParsedRow {
  qty: number
  name: string
  error?: string
}

const parsed = ref<ParsedRow[]>([])

const CONDITIONS = [
  { label: 'NM', value: 'NM' },
  { label: 'LP', value: 'LP' },
  { label: 'MP', value: 'MP' },
  { label: 'HP', value: 'HP' },
  { label: 'DMG', value: 'DMG' },
]

function parseList() {
  summary.value = null
  const lines = rawInput.value.split('\n').map(l => l.trim()).filter(Boolean)

  parsed.value = lines.map(line => {
    // Skip comment/section lines like "// Creatures" or "# Sideboard"
    if (/^[/#]/.test(line)) return null

    const match = line.match(/^(\d+)[xX]?\s+(.+)$/)
    if (match) {
      return { qty: parseInt(match[1]), name: match[2].trim() }
    }
    // No leading number — treat as qty 1
    if (line.length > 1) {
      return { qty: 1, name: line }
    }
    return null
  }).filter((r): r is ParsedRow => r !== null)
}

async function importAll() {
  if (!parsed.value.length) return
  importing.value = true
  doneCount.value = 0
  summary.value = null

  let added = 0
  const notFoundNames: string[] = []

  for (const row of parsed.value) {
    currentCardName.value = row.name
    try {
      const card = await getCardByName(row.name)
      if (!card) {
        notFoundNames.push(row.name)
      } else {
        await addCard({
          scryfallId: card.id,
          quantity: defaultFoil.value ? 0 : row.qty,
          foilQuantity: defaultFoil.value ? row.qty : 0,
          condition: defaultCondition.value,
          language: 'en',
          isProxy: false,
          isCustom: false,
          tags: [],
          deckIds: [],
        })
        added++
      }
    } catch {
      notFoundNames.push(row.name)
    }
    doneCount.value++
  }

  importing.value = false
  summary.value = { added, notFound: notFoundNames.length, notFoundNames }
}

function reset() {
  rawInput.value = ''
  parsed.value = []
  summary.value = null
  doneCount.value = 0
}
</script>
