<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="font-display text-3xl text-vault-gold">Card Scanner</h1>
      <p class="text-vault-muted text-sm mt-1">Point your camera at a card to identify and add it</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Camera viewport -->
      <div>
        <div class="scanner-viewport bg-black rounded-xl overflow-hidden" style="aspect-ratio: 4/3">
          <video ref="videoRef" class="w-full h-full object-cover" playsinline muted />
          <canvas ref="canvasRef" class="scanner-overlay w-full h-full" />

          <!-- Status overlay -->
          <div class="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="scanner.status.isScanning ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'"
              />
              <span class="text-white text-xs font-medium">
                {{ scanner.status.isScanning ? `Live · ${scanner.status.fps} fps` : 'Camera off' }}
              </span>
            </div>
            <span v-if="scanner.status.isProcessing" class="text-yellow-300 text-xs animate-pulse">
              Processing…
            </span>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex gap-3 mt-3">
          <Button
            v-if="!scanner.status.isScanning"
            label="Start Camera"
            class="flex-1"
            @click="startScan"
          >
            <template #icon><v-icon name="fa-camera" class="mr-2" /></template>
          </Button>
          <Button
            v-else
            label="Stop"
            outlined
            class="flex-1"
            @click="stopScan"
          >
            <template #icon><v-icon name="fa-stop" class="mr-2" /></template>
          </Button>
          <Button
            label="Scan Now"
            :disabled="!scanner.status.isScanning || scanner.status.isProcessing"
            class="flex-1"
            @click="doScan"
          >
            <template #icon><v-icon name="fa-search" class="mr-2" /></template>
          </Button>
        </div>

        <!-- Mode selector -->
        <div class="mt-3 flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm border transition-all"
            :class="mode === 'single'
              ? 'border-vault-accent bg-vault-accent/10 text-vault-accent'
              : 'border-vault-border text-vault-muted hover:text-vault-text'"
            @click="mode = 'single'"
          >
            Single Scan
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm border transition-all"
            :class="mode === 'batch'
              ? 'border-vault-accent bg-vault-accent/10 text-vault-accent'
              : 'border-vault-border text-vault-muted hover:text-vault-text'"
            @click="mode = 'batch'"
          >
            Batch Mode
          </button>
        </div>

        <!-- Error -->
        <div v-if="scanner.status.error" class="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {{ scanner.status.error }}
        </div>

        <!-- Model loading status -->
        <div class="mt-3 p-3 vault-card text-xs text-vault-muted flex gap-4">
          <span>
            <v-icon
              :name="scanner.status.modelsLoaded.tesseract ? 'fa-check' : 'fa-spinner'"
              :class="scanner.status.modelsLoaded.tesseract ? 'text-emerald-400' : 'animate-spin'"
              class="mr-1"
            />
            Tesseract OCR
          </span>
          <span>
            <v-icon
              :name="scanner.status.modelsLoaded.tf ? 'fa-check' : 'fa-spinner'"
              :class="scanner.status.modelsLoaded.tf ? 'text-emerald-400' : 'animate-spin'"
              class="mr-1"
            />
            TensorFlow.js
          </span>
        </div>
      </div>

      <!-- Results panel -->
      <div class="space-y-4">
        <!-- Current result -->
        <div v-if="lastResult" class="vault-card p-4 animate-slide-up">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-vault-text">Scan Result</h3>
            <span class="text-xs text-vault-muted">{{ lastResult.processingMs }}ms</span>
          </div>

          <p v-if="lastResult.rawText" class="text-xs text-vault-dim mb-3 font-mono bg-vault-surface2 px-2 py-1 rounded">
            OCR: "{{ lastResult.rawText }}"
          </p>

          <div class="space-y-2">
            <ScanResultCard
              v-for="(candidate, i) in lastResult.candidates"
              :key="candidate.scryfallId"
              :candidate="candidate"
              :is-top="i === 0"
              @confirm="confirmCard(candidate.scryfallId)"
            />
          </div>

          <p v-if="!lastResult.candidates.length" class="text-vault-muted text-sm text-center py-4">
            No cards matched. Try adjusting the card position.
          </p>
        </div>

        <!-- Batch queue -->
        <div v-if="mode === 'batch' && batchQueue.length" class="vault-card p-4">
          <h3 class="text-sm font-semibold text-vault-text mb-3">Batch Queue ({{ batchQueue.length }})</h3>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="item in batchQueue"
              :key="item.id"
              class="flex items-center gap-3 p-2 bg-vault-surface2 rounded-lg text-sm"
            >
              <img v-if="item.imageUri" :src="item.imageUri" class="w-8 h-11 object-cover rounded" />
              <span class="flex-1 truncate">{{ item.name }}</span>
              <span class="text-vault-gold text-xs">{{ item.quantity }}×</span>
              <button class="text-vault-dim hover:text-red-400" @click="removeFromBatch(item.id)">
                <v-icon name="fa-times" />
              </button>
            </div>
          </div>
          <Button label="Add All to Collection" class="w-full mt-3" @click="commitBatch" />
        </div>

        <!-- Tips -->
        <div class="vault-card p-4 text-sm space-y-2">
          <h3 class="font-semibold text-vault-text text-sm">Tips for best results</h3>
          <ul class="space-y-1 text-vault-muted text-xs">
            <li><v-icon name="fa-sun" class="mr-1 text-vault-gold" />Good lighting — avoid glare on the card</li>
            <li><v-icon name="fa-camera" class="mr-1 text-vault-accent" />Align card name with the blue guide box</li>
            <li><v-icon name="fa-arrows-alt" class="mr-1" />Hold the card steady — motion blur hurts OCR</li>
            <li><v-icon name="fa-mobile-alt" class="mr-1" />Use rear camera for better quality</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScanner } from '~/composables/useScanner'
import { useCollection } from '~/composables/useCollection'
import type { ScanCandidate, ScanResult } from '~/types'

const scanner = useScanner()
const { addCard } = useCollection()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const mode = ref<'single' | 'batch'>('single')
const lastResult = ref<ScanResult | null>(null)

interface BatchItem extends ScanCandidate { id: string; quantity: number }
const batchQueue = ref<BatchItem[]>([])

onMounted(async () => {
  if (videoRef.value && canvasRef.value) {
    await scanner.init(videoRef.value, canvasRef.value)
  }
})

onUnmounted(() => scanner.destroy())

async function startScan() {
  await scanner.startCamera('environment')
}

function stopScan() {
  scanner.stopCamera()
}

async function doScan() {
  const result = await scanner.scanCurrentFrame()
  if (result) {
    lastResult.value = result
    // Auto-confirm in batch mode if confidence is high
    if (mode.value === 'batch' && result.candidates[0]?.confidence > 0.9) {
      confirmCard(result.candidates[0].scryfallId, true)
    }
  }
}

async function confirmCard(scryfallId: string, silent = false) {
  const candidate = lastResult.value?.candidates.find(c => c.scryfallId === scryfallId)
  if (!candidate) return

  if (mode.value === 'batch') {
    // Add to batch queue, merging duplicates
    const existing = batchQueue.value.find(b => b.scryfallId === scryfallId)
    if (existing) {
      existing.quantity++
    } else {
      batchQueue.value.unshift({ ...candidate, id: crypto.randomUUID(), quantity: 1 })
    }
    if (!silent) lastResult.value = null
  } else {
    // Immediately add to collection
    await addCard({
      scryfallId,
      quantity: 1,
      foilQuantity: 0,
      condition: 'NM',
      language: 'en',
      isProxy: false,
      isCustom: false,
      tags: [],
      deckIds: [],
    })
    lastResult.value = null
  }
}

function removeFromBatch(id: string) {
  batchQueue.value = batchQueue.value.filter(b => b.id !== id)
}

async function commitBatch() {
  for (const item of batchQueue.value) {
    await addCard({
      scryfallId: item.scryfallId,
      quantity: item.quantity,
      foilQuantity: 0,
      condition: 'NM',
      language: 'en',
      isProxy: false,
      isCustom: false,
      tags: [],
      deckIds: [],
    })
  }
  batchQueue.value = []
}
</script>
