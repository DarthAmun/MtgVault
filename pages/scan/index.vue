<template>
  <div class="p-4 md:p-6 space-y-4 md:space-y-6">
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
            <span class="font-mono text-vault-dim">1 Baylen, the Haymaker (BLB) 205</span> ·
            <span class="font-mono text-vault-dim">2 *F* Counterspell (MH2) 46</span>
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
            <div class="flex items-center gap-2">
              <v-icon v-if="previewLoading" name="fa-spinner" class="animate-spin text-vault-muted text-xs" />
              <span class="text-xs text-vault-muted">
                {{ parsed.reduce((s, r) => s + r.qty, 0) }} total copies
              </span>
            </div>
          </div>

          <div class="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            <div
              v-for="(row, i) in parsed"
              :key="i"
              class="flex items-center gap-3 p-2 rounded-lg"
              :class="row.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-vault-surface2'"
            >
              <!-- Thumbnail -->
              <div class="w-9 h-12 rounded shrink-0 overflow-hidden bg-vault-surface3 flex items-center justify-center">
                <img
                  v-if="row.imageUri"
                  :src="row.imageUri"
                  :alt="row.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <v-icon v-else-if="row.resolving" name="fa-spinner" class="animate-spin text-vault-dim text-xs" />
                <v-icon v-else-if="row.error" name="fa-times" class="text-red-400 text-xs" />
                <v-icon v-else name="fa-image" class="text-vault-dim text-xs" />
              </div>

              <span class="text-xs font-mono font-bold text-vault-accent w-5 text-right shrink-0">{{ row.qty }}×</span>

              <div class="flex-1 min-w-0">
                <p class="text-sm truncate" :class="row.error ? 'text-red-400' : 'text-vault-text'">
                  {{ row.name }}
                  <span v-if="row.foil" class="text-[10px] text-vault-gold ml-1">FOIL</span>
                </p>
                <p class="text-[11px] text-vault-dim font-mono">
                  <span v-if="row.set">({{ row.set.toUpperCase() }}) {{ row.collectorNumber }}</span>
                  <span v-if="row.error" class="text-red-400/80 ml-1">· {{ row.error }}</span>
                </p>
              </div>
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

const { localGetCardByName, localGetCardBySetAndNumber } = useScryfall()
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
  set?: string
  collectorNumber?: string
  foil?: boolean
  error?: string
  imageUri?: string
  scryfallId?: string
  resolving?: boolean
}

const parsed = ref<ParsedRow[]>([])
const previewLoading = ref(false)

const CONDITIONS = [
  { label: 'NM', value: 'NM' },
  { label: 'LP', value: 'LP' },
  { label: 'MP', value: 'MP' },
  { label: 'HP', value: 'HP' },
  { label: 'DMG', value: 'DMG' },
]

function parseLine(line: string): ParsedRow | null {
  if (/^[/#]/.test(line)) return null

  // Formats:
  //   4 Lightning Bolt
  //   4x Lightning Bolt
  //   4 Lightning Bolt *F* 
  //   1 Baylen, the Haymaker (BLB) 205
  //   2 Counterspell (MH2) 46 
  //   Lightning Bolt              (qty defaults to 1)
  const re = /^(?:(\d+)[xX]?\s+)?(.+?)(?:\s+\(([A-Z0-9]+)\)(?:\s+(\S+))?(\s\*[Ff]\*)?)?$/
  const m = line.match(re)
  if (!m) return null

  const name = m[3]?.trim()
  if (!name || name.length < 2) return null

  return {
    qty: m[1] ? parseInt(m[1]) : 1,
    name,
    set: m[3]?.toLowerCase() || undefined,
    collectorNumber: m[4] || undefined,
    foil: !!m[5],
  }
}

async function parseList() {
  summary.value = null
  const lines = rawInput.value.split('\n').map(l => l.trim()).filter(Boolean)
  parsed.value = lines.map(parseLine).filter((r): r is ParsedRow => r !== null)
  await fetchPreviews()
}

async function fetchPreviews() {
  previewLoading.value = true
  // Resolve in batches of 4 to stay within Scryfall rate limits
  const BATCH = 4
  const rows = parsed.value
  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(
      rows.slice(i, i + BATCH).map(async (row) => {
        if (row.imageUri) return
        row.resolving = true
        try {
          let card = (row.set && row.collectorNumber)
            ? await localGetCardBySetAndNumber(row.set, row.collectorNumber)
            : null
          if (!card) card = await localGetCardByName(row.name, row.set)
          if (card) {
            row.imageUri = card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small
            row.scryfallId = card.id
          } else {
            row.error = 'Not found'
          }
        } catch {
          row.error = 'Lookup failed'
        }
        row.resolving = false
      })
    )
  }
  previewLoading.value = false
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
      // Re-use scryfallId resolved during preview; fall back to local-only lookup
      let scryfallId = row.scryfallId
      if (!scryfallId) {
        let card = (row.set && row.collectorNumber)
          ? await localGetCardBySetAndNumber(row.set, row.collectorNumber)
          : null
        if (!card) card = await localGetCardByName(row.name, row.set)
        scryfallId = card?.id
      }

      if (!scryfallId) {
        notFoundNames.push(row.name)
      } else {
        const isFoil = row.foil ?? defaultFoil.value
        await addCard({
          scryfallId,
          quantity: isFoil ? 0 : row.qty,
          foilQuantity: isFoil ? row.qty : 0,
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
  previewLoading.value = false
}
</script>
