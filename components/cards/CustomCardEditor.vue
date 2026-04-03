<template>
  <div class="grid md:grid-cols-2 gap-6">
    <!-- Form -->
    <div class="space-y-3">
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
      <div>
        <label class="text-xs text-vault-muted mb-1 block">Art Image (optional)</label>
        <input type="file" accept="image/*" class="text-xs text-vault-muted" @change="loadArt" />
      </div>
    </div>

    <!-- Canvas preview -->
    <div class="flex flex-col items-center gap-4">
      <canvas
        ref="cardCanvas"
        width="375"
        height="523"
        class="rounded-xl shadow-2xl max-w-full"
        style="background: #1a1625"
      />
      <div class="flex gap-2">
        <Button label="Save Custom Card" @click="save" />
        <Button label="Cancel" outlined @click="$emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import type { CustomCard, Rarity, MtgColor } from '~/types'

const emit = defineEmits<{ saved: []; close: [] }>()

const cardCanvas = ref<HTMLCanvasElement | null>(null)
const artImage = ref<HTMLImageElement | null>(null)

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
})

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic']

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#c8c8c8',
  uncommon: '#c0c8d8',
  rare: '#c6a744',
  mythic: '#e7792b',
  special: '#c8c8c8',
  bonus: '#c8c8c8',
}

function loadArt(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const img = new Image()
  img.onload = () => { artImage.value = img; renderCard() }
  img.src = URL.createObjectURL(file)
}

function renderCard() {
  const canvas = cardCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = 375, H = 523

  ctx.clearRect(0, 0, W, H)

  // Card border gradient
  const borderGrad = ctx.createLinearGradient(0, 0, W, H)
  borderGrad.addColorStop(0, '#8b7355')
  borderGrad.addColorStop(0.5, '#c9a84c')
  borderGrad.addColorStop(1, '#8b7355')
  ctx.fillStyle = borderGrad
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  // Card inner bg
  ctx.fillStyle = '#1e1a2e'
  roundRect(ctx, 8, 8, W - 16, H - 16, 12)
  ctx.fill()

  // Art box
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

  // Name bar
  ctx.fillStyle = 'rgba(15,13,24,0.85)'
  roundRect(ctx, 16, 16, W - 32, 30, 4)
  ctx.fill()
  ctx.fillStyle = '#e8e3f4'
  ctx.font = 'bold 16px Cinzel, serif'
  ctx.textAlign = 'left'
  ctx.fillText(form.name, 24, 37)

  // Mana cost (right side of name bar)
  ctx.font = 'bold 13px Inter'
  ctx.textAlign = 'right'
  ctx.fillStyle = RARITY_COLORS[form.rarity]
  ctx.fillText(form.manaCost, W - 24, 37)

  // Type line bar
  ctx.fillStyle = 'rgba(15,13,24,0.85)'
  roundRect(ctx, 16, 255, W - 32, 22, 4)
  ctx.fill()
  ctx.fillStyle = '#c8c8c8'
  ctx.font = '13px Inter'
  ctx.textAlign = 'left'
  ctx.fillText(form.typeLine, 24, 271)

  // Rarity dot
  ctx.fillStyle = RARITY_COLORS[form.rarity]
  ctx.beginPath()
  ctx.arc(W - 24, 265, 5, 0, Math.PI * 2)
  ctx.fill()

  // Text box
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

  // P/T box
  if (form.power && form.toughness) {
    ctx.fillStyle = borderGrad
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
  const canvas = cardCanvas.value
  if (!canvas) return
  const imageDataUrl = canvas.toDataURL('image/png')
  const now = new Date().toISOString()
  const card: CustomCard = {
    id: crypto.randomUUID(),
    name: form.name,
    manaCost: form.manaCost,
    typeLine: form.typeLine,
    oracleText: form.oracleText,
    flavorText: form.flavorText || undefined,
    power: form.power || undefined,
    toughness: form.toughness || undefined,
    loyalty: form.loyalty || undefined,
    colors: [],
    colorIdentity: [],
    rarity: form.rarity,
    imageDataUrl,
    createdAt: now,
    updatedAt: now,
  }
  await db.customCards.put(card)
  emit('saved')
}

onMounted(() => renderCard())
</script>
