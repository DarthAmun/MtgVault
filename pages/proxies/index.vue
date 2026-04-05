<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl text-vault-gold">Proxies</h1>
        <p class="text-vault-muted text-sm mt-1">{{ proxies.length }} proxy card{{ proxies.length !== 1 ? 's' : '' }}</p>
      </div>
      <div class="flex gap-2">
        <Button label="Create Custom Card" outlined @click="showCustom = true">
          <template #icon><v-icon name="fa-plus" class="mr-2" /></template>
        </Button>
        <Button label="Print All" :disabled="!proxies.length" :loading="printing" @click="printAll">
          <template #icon><v-icon name="fa-print" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="proxies.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <div
        v-for="item in proxies"
        :key="item.entry.id"
        class="group relative cursor-pointer"
      >
        <div class="relative aspect-[63/88] rounded-lg overflow-hidden bg-vault-surface2">
          <img
            v-if="item.imageUri"
            :src="item.imageUri"
            :alt="item.name"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button class="p-2 rounded-full bg-black/70 text-white" @click="printSingle(item)">
              <v-icon name="fa-print" />
            </button>
          </div>
          <div class="absolute bottom-1 left-1 right-1 text-center">
            <span class="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80">PROXY</span>
          </div>
        </div>
        <p class="mt-1 text-xs text-vault-muted truncate">{{ item.name }}</p>
      </div>
    </div>

    <div v-else class="text-center py-20 text-vault-muted">
      <v-icon name="fa-print" scale="2" class="mb-3" />
      <p>No proxies yet. Mark cards as proxy when adding them.</p>
    </div>

    <!-- Custom Card Dialog -->
    <Dialog v-model:visible="showCustom" modal header="Create Custom Card" class="w-full max-w-2xl">
      <CustomCardEditor @saved="onCustomSaved" @close="showCustom = false" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useCollection } from '~/composables/useCollection'
import { db } from '~/db'

const { getProxies } = useCollection()
const showCustom = ref(false)
const printing = ref(false)

interface ProxyItem {
  entry: any
  name: string
  imageUri?: string
}

const proxies = ref<ProxyItem[]>([])

async function load() {
  const entries = await getProxies()
  proxies.value = await Promise.all(
    entries.map(async entry => {
      const card = await db.scryfallCards.get(entry.scryfallId)
      return {
        entry,
        name: card?.name ?? entry.scryfallId,
        imageUri: card?.image_uris?.normal ?? card?.card_faces?.[0]?.image_uris?.normal,
      }
    })
  )
}

async function onCustomSaved() {
  showCustom.value = false
  await load()
}

/** Load an image URI (data URL or http) into an HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Draw a grid of card images onto a jsPDF doc.
 * Standard Magic card: 63mm × 88mm. 3×3 fits on A4 with margins.
 */
async function buildPDF(items: ProxyItem[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const CARD_W = 63
  const CARD_H = 88
  const COLS = 3
  const ROWS = 3
  const PER_PAGE = COLS * ROWS
  const MARGIN_X = (210 - COLS * CARD_W) / 2  // center on A4 (210mm)
  const MARGIN_Y = (297 - ROWS * CARD_H) / 2  // center on A4 (297mm)

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % PER_PAGE === 0) doc.addPage()

    const slot = i % PER_PAGE
    const col = slot % COLS
    const row = Math.floor(slot / COLS)
    const x = MARGIN_X + col * CARD_W
    const y = MARGIN_Y + row * CARD_H

    // Draw card outline
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.rect(x, y, CARD_W, CARD_H)

    const item = items[i]
    if (item.imageUri) {
      try {
        const img = await loadImage(item.imageUri)
        // Convert to data URL via canvas for jsPDF
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 480
        canvas.height = img.naturalHeight || 670
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        doc.addImage(dataUrl, 'JPEG', x, y, CARD_W, CARD_H)
      } catch {
        // Fall back to text label if image fails
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
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function printSingle(item: ProxyItem) {
  printing.value = true
  try {
    const blob = await buildPDF([item])
    downloadBlob(blob, `proxy-${item.name.replace(/\s+/g, '_')}.pdf`)
  } finally {
    printing.value = false
  }
}

async function printAll() {
  printing.value = true
  try {
    const blob = await buildPDF(proxies.value)
    downloadBlob(blob, 'proxies.pdf')
  } finally {
    printing.value = false
  }
}

onMounted(load)
</script>
