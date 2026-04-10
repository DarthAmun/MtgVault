<template>
  <div class="p-4 md:p-6 space-y-6 md:space-y-8">
    <div>
      <h1 class="font-display text-3xl text-vault-gold">Settings</h1>
      <p class="text-vault-muted text-sm mt-1">Configure MTG Vault</p>
    </div>

    <!-- Bulk Data -->
    <div class="vault-card p-6 space-y-4">
      <div>
        <h2 class="font-display text-lg text-vault-text">Offline Card Database</h2>
        <p class="text-vault-muted text-sm mt-1">
          Download the complete Scryfall database for fast offline search and autocomplete.
        </p>
      </div>

      <div class="flex items-center gap-4 p-4 bg-vault-surface2 rounded-xl">
        <v-icon name="fa-database" scale="2" class="text-vault-accent" />
        <div class="flex-1">
          <p class="font-semibold text-sm">Card Database</p>
          <p v-if="bulkMeta.lastUpdated" class="text-xs text-vault-muted">
            {{ bulkMeta.cardCount.toLocaleString() }} cards · last updated {{ new Date(bulkMeta.lastUpdated).toLocaleDateString() }}
          </p>
          <p v-else class="text-xs text-vault-muted">Not downloaded (~100MB)</p>
        </div>
        <Button
          :label="importing ? 'Downloading…' : (bulkMeta.lastUpdated ? 'Update' : 'Download')"
          :loading="importing"
          @click="startBulkImport"
        />
      </div>

      <!-- Progress -->
      <div v-if="importing" class="space-y-2">
        <ProgressBar :value="bulkProgress.percent" />
        <p class="text-xs text-vault-muted text-center">{{ bulkProgress.message }}</p>
      </div>
    </div>

    <!-- Export -->
    <div class="vault-card p-6 space-y-4">
      <h2 class="font-display text-lg text-vault-text">Export Collection</h2>
      <div class="flex flex-wrap gap-3">
        <Button label="Export as Text" outlined @click="exportText">
          <template #icon><v-icon name="fa-file-export" class="mr-2" /></template>
        </Button>
        <Button label="Export as CSV" outlined @click="exportCSV">
          <template #icon><v-icon name="fa-file-export" class="mr-2" /></template>
        </Button>
        <Button label="Export as JSON" outlined @click="exportJSON">
          <template #icon><v-icon name="fa-file-export" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="vault-card p-6 space-y-4 border-red-500/20">
      <h2 class="font-display text-lg text-red-400">Danger Zone</h2>
      <Button label="Clear All Data" severity="danger" outlined @click="clearAll">
        <template #icon><v-icon name="fa-trash" class="mr-2" /></template>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScryfall } from '~/composables/useScryfall'
import { useCollection } from '~/composables/useCollection'
import { db } from '~/db'

const { importBulkData, getBulkMeta } = useScryfall()
const { exportToText, exportToJSON, exportToCSV } = useCollection()

const importing = ref(false)
const bulkMeta = reactive({ lastUpdated: null as string | null, cardCount: 0 })
const bulkProgress = reactive({ phase: '', percent: 0, message: '' })

onMounted(async () => {
  const meta = await getBulkMeta()
  Object.assign(bulkMeta, meta)
})

async function startBulkImport() {
  importing.value = true
  try {
    await importBulkData(p => Object.assign(bulkProgress, p))
    const meta = await getBulkMeta()
    Object.assign(bulkMeta, meta)
  } finally {
    importing.value = false
  }
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function exportText() {
  const text = await exportToText()
  downloadFile(text, 'collection.txt', 'text/plain')
}

async function exportCSV() {
  const csv = await exportToCSV()
  downloadFile(csv, 'collection.csv', 'text/csv')
}

async function exportJSON() {
  const json = await exportToJSON()
  downloadFile(json, 'collection.json', 'application/json')
}

async function clearAll() {
  if (!confirm('This will delete ALL your collection and deck data. Are you sure?')) return
  await db.collection.clear()
  await db.decks.clear()
  await db.customCards.clear()
}
</script>
