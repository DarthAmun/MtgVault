<template>
  <div class="p-4 md:p-6 space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <NuxtLink to="/game-tools" class="text-xs text-vault-muted hover:text-vault-accent flex items-center gap-1 mb-1">
          <v-icon name="fa-chevron-left" scale="0.7" /> Game Tools
        </NuxtLink>
        <h1 class="font-display text-3xl text-vault-gold">Commander Party</h1>
        <p class="text-vault-muted text-sm mt-1">Upload party materials to use during your game</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-vault-accent text-white text-sm font-bold hover:bg-violet-700 transition-colors"
        @click="showUpload = true"
      >
        <v-icon name="fa-plus" scale="0.85" /> Add Material
      </button>
    </div>

    <!-- Upload zone / modal -->
    <Transition name="fade-overlay">
      <div v-if="showUpload"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background:rgba(0,0,0,0.6)"
        @click.self="showUpload = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-display text-lg font-bold text-vault-text">Add Material</h3>
            <button class="text-vault-muted hover:text-vault-text" @click="showUpload = false">
              <v-icon name="fa-times" />
            </button>
          </div>

          <div>
            <label class="text-xs text-vault-muted font-medium block mb-1">Name / Title</label>
            <input v-model="uploadName" placeholder="e.g. Dungeon Master's Party"
              class="w-full px-3 py-2 rounded-xl border border-vault-border text-sm outline-none focus:border-violet-400" />
          </div>

          <!-- Drop zone -->
          <div
            class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
            :class="dragOver ? 'border-violet-400 bg-violet-50' : 'border-vault-border hover:border-violet-300'"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onDrop"
            @click="fileInput?.click()"
          >
            <v-icon name="fa-file-import" scale="1.5" class="text-vault-muted mb-2" />
            <p class="text-sm text-vault-muted">Drop images or PDFs here</p>
            <p class="text-xs text-vault-dim mt-1">PNG, JPG, WEBP, PDF supported</p>
            <input ref="fileInput" type="file" multiple accept="image/*,.pdf" class="hidden" @change="onFileChange" />
          </div>

          <!-- Processing indicator -->
          <div v-if="processing" class="flex items-center gap-2 text-sm text-vault-muted">
            <v-icon name="fa-spinner" class="animate-spin" />
            Processing {{ processingMsg }}…
          </div>

          <!-- Preview of queued pages -->
          <div v-if="uploadQueue.length" class="space-y-1">
            <p class="text-xs text-vault-muted">{{ uploadQueue.length }} page{{ uploadQueue.length !== 1 ? 's' : '' }} ready</p>
            <div class="flex gap-1.5 overflow-x-auto pb-1">
              <img v-for="(item, i) in uploadQueue" :key="i"
                :src="item.url" class="h-16 rounded-lg object-cover shrink-0 border border-vault-border" />
            </div>
          </div>

          <div class="flex gap-2 pt-2 border-t border-vault-border">
            <button class="flex-1 py-2 rounded-xl text-sm font-bold text-vault-muted hover:bg-vault-surface2 transition-colors"
              @click="showUpload = false; uploadQueue = []">Cancel</button>
            <button
              class="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-vault-accent hover:bg-violet-700 transition-colors disabled:opacity-50"
              :disabled="!uploadQueue.length || !uploadName.trim()"
              @click="saveUpload">
              Save {{ uploadQueue.length ? `(${uploadQueue.length} pages)` : '' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Documents grid -->
    <div v-if="docs.length" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="doc in docs" :key="doc.id"
        class="vault-card group cursor-pointer overflow-hidden"
        @click="openViewer(doc)">
        <!-- Cover image -->
        <div class="aspect-[3/4] bg-vault-surface2 overflow-hidden relative">
          <img v-if="doc.coverUrl" :src="doc.coverUrl" :alt="doc.name" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <v-icon name="fa-layer-group" scale="2" class="text-vault-dim" />
          </div>
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <v-icon name="fa-search" class="text-white" scale="1.5" />
          </div>
          <!-- Page count badge -->
          <div class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white">
            {{ doc.pageCount }}p
          </div>
        </div>
        <div class="p-2.5 flex items-center justify-between gap-2">
          <p class="text-sm font-bold text-vault-text truncate">{{ doc.name }}</p>
          <button class="shrink-0 p-1 rounded text-vault-dim hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            @click.stop="deleteDoc(doc.id)">
            <v-icon name="fa-trash" scale="0.75" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-20 text-vault-muted space-y-2">
      <v-icon name="fa-layer-group" scale="2.5" class="mb-3" />
      <p class="text-sm">No materials uploaded yet.</p>
      <p class="text-xs">Upload PDFs or images to use them during your game.</p>
    </div>

    <!-- ── Fullscreen viewer ──────────────────────────────────────────── -->
    <Transition name="fade-overlay">
      <div v-if="viewer.open"
        class="fixed inset-0 z-50 flex flex-col select-none"
        style="background: #0a0a0a;">

        <!-- Viewer top bar -->
        <div class="shrink-0 flex items-center justify-between px-4 py-3" style="background:rgba(255,255,255,0.05)">
          <div>
            <p class="text-white font-bold text-sm">{{ viewer.docName }}</p>
            <p class="text-white/40 text-xs">Page {{ viewer.page + 1 }} / {{ viewer.pages.length }}</p>
          </div>
          <button class="w-9 h-9 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            @click="viewer.open = false">
            <v-icon name="fa-times" />
          </button>
        </div>

        <!-- Image display -->
        <div class="flex-1 flex items-center justify-center overflow-hidden relative"
          @click="nextPage">
          <img
            v-if="viewer.pages[viewer.page]"
            :src="viewer.pages[viewer.page]"
            class="max-w-full max-h-full object-contain"
            style="user-select:none;"
            draggable="false"
          />
          <!-- Prev / Next hints -->
          <div class="absolute inset-y-0 left-0 w-1/3 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity"
            @click.stop="prevPage">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <v-icon name="fa-chevron-left" class="text-white" />
            </div>
          </div>
          <div class="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <v-icon name="fa-chevron-right" class="text-white" />
            </div>
          </div>
        </div>

        <!-- Thumbnail strip -->
        <div class="shrink-0 flex gap-2 px-3 py-2 overflow-x-auto" style="background:rgba(0,0,0,0.5)">
          <img
            v-for="(url, i) in viewer.pages" :key="i"
            :src="url"
            class="h-14 rounded-md object-cover shrink-0 cursor-pointer transition-all"
            :class="viewer.page === i ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80'"
            @click="viewer.page = i"
          />
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { db, type PartyPage } from '~/db'

// ── Upload state ────────────────────────────────────────────────────────────
const showUpload = ref(false)
const uploadName = ref('')
const dragOver = ref(false)
const processing = ref(false)
const processingMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

interface QueueItem { blob: Blob; url: string }
const uploadQueue = ref<QueueItem[]>([])

// ── Documents (grouped view) ────────────────────────────────────────────────
interface DocSummary { id: string; name: string; pageCount: number; coverUrl: string | null }
const docs = ref<DocSummary[]>([])
const objectUrls: string[] = []

async function loadDocs() {
  const all = await db.partyPages.toArray()
  // Group by docId
  const map = new Map<string, PartyPage[]>()
  for (const p of all) {
    if (!map.has(p.docId)) map.set(p.docId, [])
    map.get(p.docId)!.push(p)
  }
  // Revoke old object URLs
  objectUrls.forEach(u => URL.revokeObjectURL(u))
  objectUrls.length = 0

  docs.value = [...map.entries()].map(([id, pages]) => {
    const sorted = pages.sort((a, b) => a.pageNum - b.pageNum)
    const coverUrl = sorted[0] ? URL.createObjectURL(sorted[0].blob) : null
    if (coverUrl) objectUrls.push(coverUrl)
    return { id, name: sorted[0].docName, pageCount: sorted.length, coverUrl }
  })
}

onMounted(loadDocs)
onUnmounted(() => objectUrls.forEach(u => URL.revokeObjectURL(u)))

// ── File handling ───────────────────────────────────────────────────────────
async function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) await processFiles(Array.from(files))
}
async function onDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files) await processFiles(Array.from(files))
}

async function processFiles(files: File[]) {
  processing.value = true
  for (const file of files) {
    processingMsg.value = file.name
    if (file.type === 'application/pdf') {
      const pages = await extractPdfPages(file)
      for (const blob of pages) {
        const url = URL.createObjectURL(blob)
        uploadQueue.value.push({ blob, url })
      }
    } else if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      uploadQueue.value.push({ blob: file, url })
    }
  }
  processing.value = false
}

async function extractPdfPages(file: File): Promise<Blob[]> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url,
    ).href

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const blobs: Blob[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, viewport }).promise
      const blob = await new Promise<Blob>(res =>
        canvas.toBlob(b => res(b!), 'image/jpeg', 0.88)
      )
      blobs.push(blob)
    }
    return blobs
  } catch (e) {
    console.error('PDF extraction failed:', e)
    return []
  }
}

async function saveUpload() {
  if (!uploadQueue.value.length || !uploadName.value.trim()) return
  const docId = crypto.randomUUID()
  const docName = uploadName.value.trim()

  await db.partyPages.bulkAdd(
    uploadQueue.value.map((item: QueueItem, i: number) => ({
      id: crypto.randomUUID(),
      docId,
      docName,
      pageNum: i,
      blob: item.blob,
    }))
  )

  // Cleanup
  uploadQueue.value.forEach((item: QueueItem) => URL.revokeObjectURL(item.url))
  uploadQueue.value = []
  uploadName.value = ''
  showUpload.value = false
  await loadDocs()
}

async function deleteDoc(docId: string) {
  if (!confirm('Delete this material?')) return
  await db.partyPages.where('docId').equals(docId).delete()
  await loadDocs()
}

// ── Viewer ──────────────────────────────────────────────────────────────────
const viewer = reactive({
  open: false,
  docName: '',
  pages: [] as string[],
  page: 0,
})
const viewerUrls: string[] = []

async function openViewer(doc: DocSummary) {
  viewerUrls.forEach(u => URL.revokeObjectURL(u))
  viewerUrls.length = 0

  const pages = await db.partyPages.where('docId').equals(doc.id).sortBy('pageNum')
  viewer.pages = pages.map(p => {
    const url = URL.createObjectURL(p.blob)
    viewerUrls.push(url)
    return url
  })
  viewer.docName = doc.name
  viewer.page = 0
  viewer.open = true
}

function nextPage() {
  if (viewer.page < viewer.pages.length - 1) viewer.page++
}
function prevPage() {
  if (viewer.page > 0) viewer.page--
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (!viewer.open) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage()
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage()
  if (e.key === 'Escape') viewer.open = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  viewerUrls.forEach(u => URL.revokeObjectURL(u))
})
</script>

<style scoped>
.fade-overlay-enter-active, .fade-overlay-leave-active { transition: opacity 0.2s; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }
</style>
