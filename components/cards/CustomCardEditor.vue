<template>
  <div class="grid md:grid-cols-2 gap-6">
    <!-- Form -->
    <div class="space-y-3 overflow-y-auto max-h-[75vh] pr-1">
      <div>
        <label class="text-xs text-vault-muted mb-1 block">Card Name</label>
        <InputText v-model="form.name" class="w-full" @input="renderCard" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-vault-muted mb-1 block">Mana Cost</label>
          <InputText v-model="form.manaCost" placeholder="{2}{U}{B}" class="w-full" @input="renderCard" />
        </div>
        <div>
          <label class="text-xs text-vault-muted mb-1 block">Rarity</label>
          <Select v-model="form.rarity" :options="RARITIES" class="w-full" @change="renderCard" />
        </div>
      </div>
      <div>
        <label class="text-xs text-vault-muted mb-1 block">Type Line</label>
        <InputText v-model="form.typeLine" placeholder="Legendary Creature — Dragon" class="w-full" @input="renderCard" />
      </div>

      <!-- Color identity -->
      <div>
        <label class="text-xs text-vault-muted mb-1 block">Color Identity</label>
        <div class="flex gap-2">
          <button
            v-for="color in ALL_COLORS"
            :key="color"
            class="color-pip w-6 h-6 transition-opacity"
            :class="[`mana-${color}`, form.colorIdentity.includes(color) ? 'opacity-100' : 'opacity-30']"
            @click="toggleColor(color)"
          />
        </div>
      </div>

      <div>
        <label class="text-xs text-vault-muted mb-1 block">Card Text</label>
        <Textarea v-model="form.oracleText" rows="4" class="w-full" @input="renderCard" />
      </div>
      <div>
        <label class="text-xs text-vault-muted mb-1 block">Flavor Text</label>
        <Textarea v-model="form.flavorText" rows="2" class="w-full" @input="renderCard" />
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="text-xs text-vault-muted mb-1 block">Power</label>
          <InputText v-model="form.power" class="w-full" @input="renderCard" />
        </div>
        <div>
          <label class="text-xs text-vault-muted mb-1 block">Toughness</label>
          <InputText v-model="form.toughness" class="w-full" @input="renderCard" />
        </div>
        <div>
          <label class="text-xs text-vault-muted mb-1 block">Loyalty</label>
          <InputText v-model="form.loyalty" class="w-full" @input="renderCard" />
        </div>
      </div>
      <!-- Image mode toggle -->
      <div class="pt-1 space-y-2">
        <div class="flex rounded-lg overflow-hidden border border-vault-border text-xs font-medium">
          <button
            class="flex-1 py-1.5 transition-colors"
            :class="imageMode === 'art' ? 'bg-vault-accent text-white' : 'text-vault-muted hover:text-vault-text'"
            @click="imageMode = 'art'"
          >Art (canvas frame)</button>
          <button
            class="flex-1 py-1.5 transition-colors"
            :class="imageMode === 'full' ? 'bg-vault-accent text-white' : 'text-vault-muted hover:text-vault-text'"
            @click="imageMode = 'full'"
          >Full card image</button>
        </div>

        <div v-if="imageMode === 'art'">
          <label class="text-xs text-vault-muted mb-1 block">Art for canvas frame</label>
          <input type="file" accept="image/*" class="text-xs text-vault-muted w-full" @change="loadArt" />
        </div>

        <div v-else class="space-y-2">
          <label class="text-xs text-vault-muted block">Upload your full card image — this replaces the canvas render</label>
          <input type="file" accept="image/*" class="text-xs text-vault-muted w-full" @change="loadFullCard" />
          <p v-if="fullCardDataUrl" class="text-[10px] text-emerald-400">Image loaded ✓</p>
        </div>
      </div>

      <!-- Delete (edit mode only) -->
      <div v-if="existingCard" class="pt-2 border-t border-vault-border">
        <Button
          label="Delete Custom Card"
          severity="danger"
          outlined
          size="small"
          class="w-full"
          @click="confirmDelete"
        >
          <template #icon><v-icon name="fa-trash" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Preview -->
    <div class="flex flex-col items-center gap-4">
      <!-- Full card image preview -->
      <img
        v-if="imageMode === 'full' && fullCardDataUrl"
        :src="fullCardDataUrl"
        class="rounded-xl shadow-2xl max-w-full"
        style="max-height: 523px; object-fit: contain;"
        alt="Card preview"
      />
      <!-- Placeholder when no full image yet -->
      <div
        v-else-if="imageMode === 'full'"
        class="rounded-xl shadow-2xl flex items-center justify-center text-vault-dim bg-vault-surface2"
        style="width: 375px; height: 523px;"
      >
        <p class="text-sm text-center px-6">Upload a full card image to preview it here</p>
      </div>
      <!-- Canvas render -->
      <canvas
        v-show="imageMode === 'art'"
        ref="cardCanvas"
        width="375"
        height="523"
        class="rounded-xl shadow-2xl max-w-full"
        style="background: #1a1625"
      />
      <div class="flex gap-2 w-full">
        <Button label="Cancel" outlined class="flex-1" @click="$emit('close')" />
        <Button :label="existingCard ? 'Save Changes' : 'Add to Collection'" class="flex-1" @click="save" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCustomCards, CUSTOM_ID_PREFIX } from '~/composables/useCustomCards'
import { db } from '~/db'
import type { CustomCard, Rarity, MtgColor } from '~/types'

const props = defineProps<{ existingCard?: CustomCard }>()
const emit = defineEmits<{ saved: []; close: []; deleted: [] }>()

const { saveCustomCard, deleteCustomCard } = useCustomCards()

const cardCanvas = ref<HTMLCanvasElement | null>(null)
const artImage = ref<HTMLImageElement | null>(null)
const imageMode = ref<'art' | 'full'>('art')
const fullCardDataUrl = ref<string | null>(null)

const ALL_COLORS: MtgColor[] = ['W', 'U', 'B', 'R', 'G']
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic']
const RARITY_COLORS: Record<Rarity, string> = {
  common: '#c8c8c8',
  uncommon: '#c0c8d8',
  rare: '#c6a744',
  mythic: '#e7792b',
  special: '#c8c8c8',
  bonus: '#c8c8c8',
}

const form = reactive({
  name: 'My Custom Card',
  manaCost: '{3}{R}',
  typeLine: 'Legendary Creature — Dragon',
  oracleText: 'Flying, haste\nWhen this creature enters, deal 3 damage to any target.',
  flavorText: '"The sky trembled."',
  power: '5',
  toughness: '4',
  loyalty: '',
  rarity: 'rare' as Rarity,
  colorIdentity: [] as MtgColor[],
})

// Pre-populate when editing
onMounted(async () => {
  if (props.existingCard) {
    const c = props.existingCard
    form.name = c.name
    form.manaCost = c.manaCost
    form.typeLine = c.typeLine
    form.oracleText = c.oracleText
    form.flavorText = c.flavorText ?? ''
    form.power = c.power ?? ''
    form.toughness = c.toughness ?? ''
    form.loyalty = c.loyalty ?? ''
    form.rarity = c.rarity
    form.colorIdentity = [...c.colorIdentity]

    if (c.imageDataUrl) {
      // Detect whether the stored image was a full-card upload or a canvas render.
      // Full card images are stored with a marker prefix; canvas renders are plain data URLs.
      if (c.imageDataUrl.startsWith('data:image/') && c.isFullCardImage) {
        imageMode.value = 'full'
        fullCardDataUrl.value = c.imageDataUrl
      } else {
        imageMode.value = 'art'
        const img = new Image()
        img.onload = () => { artImage.value = img; renderCard() }
        img.src = c.imageDataUrl
        return
      }
    }
  }
  renderCard()
})

function toggleColor(color: MtgColor) {
  const idx = form.colorIdentity.indexOf(color)
  if (idx >= 0) form.colorIdentity.splice(idx, 1)
  else form.colorIdentity.push(color)
  renderCard()
}

function loadArt(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const img = new Image()
  img.onload = () => { artImage.value = img; renderCard() }
  img.src = URL.createObjectURL(file)
}

function loadFullCard(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { fullCardDataUrl.value = reader.result as string }
  reader.readAsDataURL(file)
}

/** Color stops per MTG color — matches official card frame hues */
const COLOR_STOPS: Record<string, [string, string, string]> = {
  W: ['#f9f6ee', '#e8e0c8', '#c8bfa0'],
  U: ['#1a4a8a', '#2d6bb5', '#1a4a8a'],
  B: ['#1a1a2e', '#3d2b4a', '#1a1a2e'],
  R: ['#8b1a1a', '#c0392b', '#8b1a1a'],
  G: ['#1a5c2a', '#27ae60', '#1a5c2a'],
  // Multi-color (gold)
  M: ['#8b7355', '#c9a84c', '#8b7355'],
  // Colorless (silver)
  C: ['#5a5a6e', '#8a8a9e', '#5a5a6e'],
}

function frameColors(colorIdentity: string[]): [string, string, string] {
  if (colorIdentity.length === 0) return COLOR_STOPS.C
  if (colorIdentity.length === 1) return COLOR_STOPS[colorIdentity[0]] ?? COLOR_STOPS.C
  return COLOR_STOPS.M // multicolor = gold
}

function renderCard() {
  const canvas = cardCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = 375, H = 523

  ctx.clearRect(0, 0, W, H)

  const [c0, c1, c2] = frameColors(form.colorIdentity)
  const borderGrad = ctx.createLinearGradient(0, 0, W, H)
  borderGrad.addColorStop(0, c0)
  borderGrad.addColorStop(0.5, c1)
  borderGrad.addColorStop(1, c2)
  ctx.fillStyle = borderGrad
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  ctx.fillStyle = '#1e1a2e'
  roundRect(ctx, 8, 8, W - 16, H - 16, 12)
  ctx.fill()

  if (artImage.value) {
    ctx.save()
    roundRect(ctx, 20, 50, W - 40, 200, 6)
    ctx.clip()
    ctx.drawImage(artImage.value, 20, 50, W - 40, 200)
    ctx.restore()
  } else {
    ctx.fillStyle = '#2d2845'
    roundRect(ctx, 20, 50, W - 40, 200, 6)
    ctx.fill()
    ctx.fillStyle = '#5a5472'
    ctx.font = '14px Inter'
    ctx.textAlign = 'center'
    ctx.fillText('Art goes here', W / 2, 155)
  }

  // CUSTOM badge
  ctx.fillStyle = 'rgba(124,58,237,0.85)'
  roundRect(ctx, W - 80, 8, 72, 18, 3)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 10px Inter'
  ctx.textAlign = 'center'
  ctx.fillText('CUSTOM', W - 44, 21)

  ctx.fillStyle = 'rgba(15,13,24,0.85)'
  roundRect(ctx, 16, 16, W - 32, 30, 4)
  ctx.fill()
  ctx.fillStyle = '#e8e3f4'
  ctx.font = 'bold 16px Cinzel, serif'
  ctx.textAlign = 'left'
  ctx.fillText(form.name, 24, 37)

  ctx.font = 'bold 13px Inter'
  ctx.textAlign = 'right'
  ctx.fillStyle = RARITY_COLORS[form.rarity]
  ctx.fillText(form.manaCost, W - 24, 37)

  ctx.fillStyle = 'rgba(15,13,24,0.85)'
  roundRect(ctx, 16, 255, W - 32, 22, 4)
  ctx.fill()
  ctx.fillStyle = '#c8c8c8'
  ctx.font = '13px Inter'
  ctx.textAlign = 'left'
  ctx.fillText(form.typeLine, 24, 271)

  ctx.fillStyle = RARITY_COLORS[form.rarity]
  ctx.beginPath()
  ctx.arc(W - 24, 265, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(26,22,37,0.92)'
  roundRect(ctx, 16, 282, W - 32, 190, 6)
  ctx.fill()
  ctx.fillStyle = '#d8d4ea'
  ctx.font = '13px Inter'
  wrapText(ctx, form.oracleText, 26, 304, W - 52, 18)

  if (form.flavorText) {
    ctx.fillStyle = '#8f88aa'
    ctx.font = 'italic 12px Inter'
    wrapText(ctx, form.flavorText, 26, 420, W - 52, 16)
  }

  if (form.power && form.toughness) {
    const ptGrad = ctx.createLinearGradient(W - 70, 0, W - 16, 0)
    ptGrad.addColorStop(0, c0)
    ptGrad.addColorStop(0.5, c1)
    ptGrad.addColorStop(1, c2)
    ctx.fillStyle = ptGrad
    roundRect(ctx, W - 70, H - 36, 54, 24, 4)
    ctx.fill()
    ctx.fillStyle = '#0f0d18'
    ctx.font = 'bold 14px Inter'
    ctx.textAlign = 'center'
    ctx.fillText(`${form.power}/${form.toughness}`, W - 43, H - 18)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const lines = text.split('\n')
  let cy = y
  for (const line of lines) {
    const words = line.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxW && current) {
        ctx.fillText(current, x, cy)
        cy += lineH
        current = word
      } else {
        current = test
      }
    }
    if (current) { ctx.fillText(current, x, cy); cy += lineH }
    cy += 2
  }
}

async function save() {
  const now = new Date().toISOString()
  const colorIdentity = [...toRaw(form.colorIdentity)]

  let imageDataUrl: string | undefined
  let isFullCardImage = false

  if (imageMode.value === 'full' && fullCardDataUrl.value) {
    imageDataUrl = fullCardDataUrl.value
    isFullCardImage = true
  } else {
    const canvas = cardCanvas.value
    if (canvas) imageDataUrl = canvas.toDataURL('image/png')
  }

  const card: CustomCard = {
    id: props.existingCard?.id ?? crypto.randomUUID(),
    name: form.name,
    manaCost: form.manaCost,
    typeLine: form.typeLine,
    oracleText: form.oracleText,
    flavorText: form.flavorText || undefined,
    power: form.power || undefined,
    toughness: form.toughness || undefined,
    loyalty: form.loyalty || undefined,
    colors: colorIdentity,
    colorIdentity,
    rarity: form.rarity,
    imageDataUrl,
    isFullCardImage,
    createdAt: props.existingCard?.createdAt ?? now,
    updatedAt: now,
  }
  await saveCustomCard(card)
  emit('saved')
}

async function confirmDelete() {
  if (!props.existingCard) return
  if (!confirm(`Delete "${props.existingCard.name}"? This removes it from your collection.`)) return
  await deleteCustomCard(props.existingCard.id)
  emit('deleted')
}
</script>
