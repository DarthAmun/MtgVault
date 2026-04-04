import type { ScanResult, ScanCandidate } from '~/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScannerStatus {
  isReady: boolean
  isScanning: boolean
  isProcessing: boolean
  error: string | null
  lastResult: ScanResult | null
  fps: number
  modelsLoaded: { tf: boolean; tesseract: boolean }
}

// ─── Card geometry constants (standard MTG card: 63×88mm) ──────────────────
const CARD_ASPECT = 63 / 88  // ~0.716
const NAME_ROW_TOP = 0.04    // name bar starts ~4% from top
const NAME_ROW_BOT = 0.12    // ends ~12% from top

export function useScanner() {
  const status = reactive<ScannerStatus>({
    isReady: false,
    isScanning: false,
    isProcessing: false,
    error: null,
    lastResult: null,
    fps: 0,
    modelsLoaded: { tf: false, tesseract: false },
  })

  let videoEl: HTMLVideoElement | null = null
  let canvasEl: HTMLCanvasElement | null = null
  let animFrameId: number | null = null
  let stream: MediaStream | null = null
  let worker: Tesseract.Worker | null = null

  // FPS tracking
  let frameCount = 0
  let lastFpsTime = Date.now()

  // ── Initialization ─────────────────────────────────────────────────────

  async function init(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    videoEl = video
    canvasEl = canvas

    try {
      await Promise.all([loadTesseract(), loadTFModels()])
      status.isReady = true
    } catch (e) {
      status.error = `Init failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  async function loadTesseract() {
    // Lazy import — Vite pre-bundles this (CJS→ESM) so `require` is never
    // exposed to the browser directly.
    const { createWorker } = await import('tesseract.js')
    // worker.min.js copied to public/ so it's served at a known URL with the
    // correct JS MIME type. workerBlobURL:false loads it directly as a Worker.
    worker = await createWorker('eng', 1, {
      workerPath: '/tesseract-worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js',
      workerBlobURL: false,
      logger: () => {},
    })
    // Tune for card name bars: single line, large text
    await worker.setParameters({
      tessedit_pageseg_mode: '7',   // single line
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',-.!",
    })
    status.modelsLoaded.tesseract = true
  }

  async function loadTFModels() {
    // TF.js for card detection / corner finding
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    status.modelsLoaded.tf = true
  }

  // ── Camera ─────────────────────────────────────────────────────────────

  async function startCamera(facingMode: 'environment' | 'user' = 'environment') {
    if (!videoEl) return

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      })
      videoEl.srcObject = stream
      await videoEl.play()
      status.isScanning = true
      startFrameLoop()
    } catch (e: any) {
      status.error = `Camera error: ${e.message}`
    }
  }

  function stopCamera() {
    status.isScanning = false
    if (animFrameId !== null) cancelAnimationFrame(animFrameId)
    stream?.getTracks().forEach(t => t.stop())
    stream = null
  }

  // ── Frame Loop ─────────────────────────────────────────────────────────

  function startFrameLoop() {
    const loop = () => {
      if (!status.isScanning) return
      drawFrame()
      updateFps()
      animFrameId = requestAnimationFrame(loop)
    }
    animFrameId = requestAnimationFrame(loop)
  }

  function drawFrame() {
    if (!videoEl || !canvasEl) return
    const ctx = canvasEl.getContext('2d')!
    canvasEl.width = videoEl.videoWidth
    canvasEl.height = videoEl.videoHeight
    ctx.drawImage(videoEl, 0, 0)
    drawCardGuide(ctx, canvasEl.width, canvasEl.height)
  }

  function drawCardGuide(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Draw a card-shaped guide overlay
    const margin = w * 0.1
    const cardW = w - margin * 2
    const cardH = cardW / CARD_ASPECT
    const cardX = margin
    const cardY = (h - cardH) / 2

    ctx.save()
    ctx.strokeStyle = 'rgba(200, 160, 60, 0.9)'
    ctx.lineWidth = 3
    ctx.setLineDash([12, 6])
    ctx.strokeRect(cardX, cardY, cardW, cardH)

    // Name bar highlight
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.strokeRect(
      cardX + cardW * 0.05,
      cardY + cardH * NAME_ROW_TOP,
      cardW * 0.65,
      cardH * (NAME_ROW_BOT - NAME_ROW_TOP)
    )
    ctx.restore()
  }

  function updateFps() {
    frameCount++
    const now = Date.now()
    if (now - lastFpsTime >= 1000) {
      status.fps = frameCount
      frameCount = 0
      lastFpsTime = now
    }
  }

  // ── Scan ───────────────────────────────────────────────────────────────

  async function scanCurrentFrame(): Promise<ScanResult | null> {
    if (!videoEl || !canvasEl || status.isProcessing) return null
    if (!status.isReady) {
      status.error = 'Scanner not ready — models still loading'
      return null
    }

    status.isProcessing = true
    const t0 = Date.now()

    try {
      // 1. Grab frame
      const ctx = canvasEl.getContext('2d')!
      const w = canvasEl.width
      const h = canvasEl.height

      // 2. Define the card region (center of frame using guide)
      const margin = w * 0.1
      const cardW = w - margin * 2
      const cardH = cardW / CARD_ASPECT
      const cardX = margin
      const cardY = (h - cardH) / 2

      // 3. Crop just the name bar region
      const nameX = cardX + cardW * 0.05
      const nameY = cardY + cardH * NAME_ROW_TOP
      const nameW = cardW * 0.65
      const nameH = cardH * (NAME_ROW_BOT - NAME_ROW_TOP)

      const nameCanvas = document.createElement('canvas')
      nameCanvas.width = Math.floor(nameW)
      nameCanvas.height = Math.floor(nameH)
      const nameCtx = nameCanvas.getContext('2d')!

      // Draw name bar region, scaled up for better OCR
      const SCALE = 4
      nameCanvas.width = Math.floor(nameW * SCALE)
      nameCanvas.height = Math.floor(nameH * SCALE)
      nameCtx.imageSmoothingEnabled = false
      nameCtx.drawImage(canvasEl, nameX, nameY, nameW, nameH, 0, 0, nameCanvas.width, nameCanvas.height)

      // 4. Pre-process: grayscale + contrast boost
      preprocessForOCR(nameCtx, nameCanvas.width, nameCanvas.height)

      // 5. OCR the name bar
      if (!worker) throw new Error('Tesseract not loaded')
      const { data } = await worker.recognize(nameCanvas)
      const rawText = data.text.trim()

      // 6. Fuzzy match against Scryfall cache
      const candidates = await matchCardName(rawText)

      const result: ScanResult = {
        confidence: candidates[0]?.confidence ?? 0,
        candidates,
        rawText,
        processingMs: Date.now() - t0,
      }

      status.lastResult = result
      return result
    } catch (e: any) {
      status.error = e.message
      return null
    } finally {
      status.isProcessing = false
    }
  }

  // ── Image Pre-processing ───────────────────────────────────────────────

  function preprocessForOCR(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      // Grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      // Contrast stretch
      const contrasted = Math.min(255, Math.max(0, (gray - 80) * 2))
      data[i] = data[i + 1] = data[i + 2] = contrasted
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // ── Card Name Matching ─────────────────────────────────────────────────

  async function matchCardName(rawText: string): Promise<ScanCandidate[]> {
    const { db } = await import('~/db')

    // Clean up OCR artifacts
    const cleaned = rawText
      .replace(/[^a-zA-Z ,'\-!]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleaned || cleaned.length < 2) return []

    // Direct DB lookup first
    const exact = await db.scryfallCards
      .where('name')
      .equalsIgnoreCase(cleaned)
      .first()

    if (exact) {
      return [{
        scryfallId: exact.id,
        name: exact.name,
        set: exact.set_name,
        confidence: 0.98,
        imageUri: exact.image_uris?.normal ?? exact.card_faces?.[0]?.image_uris?.normal,
      }]
    }

    // Fuzzy search in local DB
    const candidates = await db.scryfallCards
      .where('name')
      .startsWithIgnoreCase(cleaned.slice(0, Math.min(cleaned.length, 6)))
      .limit(30)
      .toArray()

    if (!candidates.length) {
      // Fall back to Scryfall API autocomplete
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleaned)}`)
        if (res.ok) {
          const card = await res.json()
          await db.scryfallCards.put(card)
          return [{
            scryfallId: card.id,
            name: card.name,
            set: card.set_name,
            confidence: 0.7,
            imageUri: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal,
          }]
        }
      } catch {}
      return []
    }

    // Score candidates by Levenshtein distance
    const scored = candidates.map(c => ({
      card: c,
      score: levenshteinSimilarity(cleaned.toLowerCase(), c.name.toLowerCase()),
    }))
    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, 5).map(({ card, score }) => ({
      scryfallId: card.id,
      name: card.name,
      set: card.set_name,
      confidence: score,
      imageUri: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal,
    }))
  }

  // ── Utils ──────────────────────────────────────────────────────────────

  function levenshteinSimilarity(a: string, b: string): number {
    const m = a.length, n = b.length
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    return 1 - dp[m][n] / Math.max(m, n)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  async function destroy() {
    stopCamera()
    await worker?.terminate()
  }

  return {
    status: readonly(status),
    init,
    startCamera,
    stopCamera,
    scanCurrentFrame,
    destroy,
  }
}
