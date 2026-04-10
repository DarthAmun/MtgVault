<template>
  <div class="p-4 md:p-6 space-y-4 md:space-y-6">
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="font-display text-3xl text-vault-gold">Proxies</h1>
        <p class="text-vault-muted text-sm mt-1">{{ proxies.length }} proxy card{{ proxies.length !== 1 ? 's' : '' }}</p>
      </div>
      <div class="flex gap-2">
        <Button label="Custom Card" outlined @click="showCustom = true">
          <template #icon><v-icon name="fa-magic" class="mr-2" /></template>
        </Button>
        <Button label="Print All" :disabled="!proxies.length" :loading="printing" @click="printAll">
          <template #icon><v-icon name="fa-print" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Card search / add proxy -->
    <div class="vault-card p-4 space-y-3">
      <label class="text-sm font-medium text-vault-text">Add card as proxy</label>
      <div class="flex gap-2">
        <AutoComplete
          v-model="searchQuery"
          :suggestions="suggestions"
          option-label="name"
          placeholder="Search any card in database…"
          class="flex-1"
          @complete="onComplete"
          @item-select="onSelect"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3 py-1">
              <img
                v-if="option.image_uris?.small ?? option.card_faces?.[0]?.image_uris?.small"
                :src="option.image_uris?.small ?? option.card_faces?.[0]?.image_uris?.small"
                class="w-8 h-11 rounded object-cover shrink-0"
              />
              <div class="min-w-0">
                <p class="font-medium text-vault-text truncate">{{ option.name }}</p>
                <p class="text-xs text-vault-muted">{{ option.set_name }} · #{{ option.collector_number }}</p>
              </div>
            </div>
          </template>
        </AutoComplete>
        <Button label="Add Proxy" :disabled="!selectedCard" @click="addProxy" />
      </div>

      <!-- Preview of selected card -->
      <div v-if="selectedCard" class="flex gap-3 items-center p-3 bg-vault-surface2 rounded-xl">
        <img
          v-if="selectedCard.image_uris?.small ?? selectedCard.card_faces?.[0]?.image_uris?.small"
          :src="selectedCard.image_uris?.small ?? selectedCard.card_faces?.[0]?.image_uris?.small"
          class="w-10 h-14 rounded object-cover shrink-0"
          :alt="selectedCard.name"
        />
        <div class="text-sm min-w-0">
          <p class="font-medium truncate">{{ selectedCard.name }}</p>
          <p class="text-xs text-vault-muted">{{ selectedCard.set_name }} · #{{ selectedCard.collector_number }}</p>
        </div>
        <span v-if="alreadyInQueue" class="ml-auto text-xs text-amber-400 shrink-0">Already in queue</span>
      </div>
    </div>

    <!-- Proxy grid -->
    <div v-if="proxies.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <div
        v-for="item in proxies"
        :key="item.scryfallId"
        class="group relative cursor-pointer"
      >
        <div class="relative aspect-[63/88] rounded-lg overflow-hidden bg-vault-surface2">
          <img
            v-if="item.imageUri"
            :src="item.imageUri"
            :alt="item.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center p-2 text-center">
            <p class="text-xs text-vault-muted">{{ item.name }}</p>
          </div>

          <!-- Hover actions -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              class="p-2 rounded-full bg-black/70 text-white hover:bg-vault-accent/80 transition-colors"
              title="Print"
              @click.stop="printSingle(item)"
            >
              <v-icon name="fa-print" scale="0.9" />
            </button>
            <button
              class="p-2 rounded-full bg-black/70 text-red-400 hover:bg-red-500/80 hover:text-white transition-colors"
              title="Remove proxy"
              @click.stop="removeProxy(item)"
            >
              <v-icon name="fa-times" scale="0.9" />
            </button>
          </div>

          <div class="absolute bottom-1 left-1 right-1 text-center pointer-events-none">
            <span class="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80">PROXY</span>
          </div>
        </div>
        <p class="mt-1 text-xs text-vault-muted truncate">{{ item.name }}</p>
      </div>
    </div>

    <div v-else class="text-center py-16 text-vault-muted">
      <v-icon name="fa-print" scale="2" class="mb-3" />
      <p class="text-sm">Search for a card above to add it as a proxy.</p>
    </div>

    <!-- Custom Card Dialog -->
    <Dialog v-model:visible="showCustom" modal header="Create Custom Card" class="w-full max-w-4xl">
      <CustomCardEditor @saved="onCustomSaved" @close="showCustom = false" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScryfall } from '~/composables/useScryfall'
import { db } from '~/db'
import type { ScryfallCard } from '~/types'

const { autocompleteCards } = useScryfall()

const QUEUE_KEY = 'proxy_print_queue'

const showCustom = ref(false)
const printing = ref(false)
const searchQuery = ref<string | ScryfallCard>('')
const suggestions = ref<ScryfallCard[]>([])
const selectedCard = ref<ScryfallCard | null>(null)

interface ProxyItem { scryfallId: string; name: string; imageUri?: string }
const proxies = ref<ProxyItem[]>([])

const alreadyInQueue = computed(() =>
  selectedCard.value
    ? proxies.value.some(p => p.scryfallId === selectedCard.value!.id)
    : false
)

async function loadQueue(): Promise<string[]> {
  const row = await db.syncMeta.get(QUEUE_KEY)
  return row?.value ? JSON.parse(row.value as string) : []
}

async function saveQueue(ids: string[]) {
  await db.syncMeta.put({ key: QUEUE_KEY, value: JSON.stringify(ids) })
}

async function load() {
  const ids = await loadQueue()
  proxies.value = await Promise.all(
    ids.map(async id => {
      const card = await db.scryfallCards.get(id)
      return {
        scryfallId: id,
        name: card?.name ?? id,
        imageUri: card?.image_uris?.normal ?? card?.card_faces?.[0]?.image_uris?.normal,
      }
    })
  )
}

async function onComplete(e: { query: string }) {
  suggestions.value = await autocompleteCards(e.query)
}

function onSelect(e: { value: ScryfallCard }) {
  selectedCard.value = e.value
  searchQuery.value = e.value.name
}

async function addProxy() {
  if (!selectedCard.value || alreadyInQueue.value) return
  const ids = await loadQueue()
  ids.push(selectedCard.value.id)
  await saveQueue(ids)
  selectedCard.value = null
  searchQuery.value = ''
  await load()
}

async function removeProxy(item: ProxyItem) {
  const ids = await loadQueue()
  await saveQueue(ids.filter(id => id !== item.scryfallId))
  await load()
}

async function onCustomSaved() {
  showCustom.value = false
  await load()
}

// ── PDF generation ───────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function buildPDF(items: ProxyItem[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const CARD_W = 63
  const CARD_H = 88
  const COLS = 3
  const ROWS = 3
  const PER_PAGE = COLS * ROWS
  const MARGIN_X = (210 - COLS * CARD_W) / 2
  const MARGIN_Y = (297 - ROWS * CARD_H) / 2

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % PER_PAGE === 0) doc.addPage()

    const slot = i % PER_PAGE
    const x = MARGIN_X + (slot % COLS) * CARD_W
    const y = MARGIN_Y + Math.floor(slot / COLS) * CARD_H

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.rect(x, y, CARD_W, CARD_H)

    const item = items[i]
    if (item.imageUri) {
      try {
        const img = await loadImage(item.imageUri)
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 480
        canvas.height = img.naturalHeight || 670
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', x, y, CARD_W, CARD_H)
      } catch {
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(item.name, x + CARD_W / 2, y + CARD_H / 2, { align: 'center' })
      }
    } else {
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(item.name, x + CARD_W / 2, y + CARD_H / 2, { align: 'center' })
    }
  }

  return doc.output('blob')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

async function printSingle(item: ProxyItem) {
  printing.value = true
  try {
    downloadBlob(await buildPDF([item]), `proxy-${item.name.replace(/\s+/g, '_')}.pdf`)
  } finally { printing.value = false }
}

async function printAll() {
  printing.value = true
  try {
    downloadBlob(await buildPDF(proxies.value), 'proxies.pdf')
  } finally { printing.value = false }
}

onMounted(load)
</script>
