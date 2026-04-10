<template>
  <div class="flex-1 flex flex-col select-none" style="touch-action: manipulation; overflow: hidden;">

    <!-- Top bar -->
    <div class="flex items-center justify-between px-3 py-1.5 shrink-0 gap-2 flex-wrap"
         style="border-bottom:1px solid rgba(124,58,237,0.10); background: rgba(255,255,255,0.5);">
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-vault-muted uppercase tracking-wider">Players</span>
        <div class="flex gap-1">
          <button v-for="n in [2,3,4,5,6]" :key="n"
            class="w-7 h-7 rounded-md text-xs font-bold transition-colors"
            :class="playerCount === n ? 'bg-violet-600 text-white' : 'text-vault-muted hover:text-vault-text hover:bg-violet-50'"
            @click="setPlayerCount(n)">{{ n }}</button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-vault-muted uppercase tracking-wider">Start</span>
        <div class="flex gap-1">
          <button v-for="life in [20, 30, 40]" :key="life"
            class="px-2.5 h-7 rounded-md text-xs font-bold transition-colors"
            :class="startingLife === life ? 'bg-violet-600 text-white' : 'text-vault-muted hover:text-vault-text hover:bg-violet-50'"
            @click="setStartingLife(life)">{{ life }}</button>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          class="px-2.5 h-7 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
          :class="showCmdDamage ? 'bg-yellow-500/20 text-yellow-600' : 'text-vault-muted hover:text-vault-text hover:bg-violet-50'"
          @click="showCmdDamage = !showCmdDamage">
          <v-icon name="fa-crown" scale="0.65" /> CMD
        </button>
        <button
          class="px-2.5 h-7 rounded-md text-xs font-bold text-vault-muted hover:text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
          @click="confirmReset">
          <v-icon name="fa-undo" scale="0.65" /> Reset
        </button>
      </div>
    </div>

    <!-- Player grid -->
    <div ref="gridRef" class="flex-1 min-h-0 p-1.5 gap-1.5 grid" :class="gridClass">
      <div
        v-for="(player, index) in players"
        :key="player.id"
        class="relative rounded-xl overflow-hidden"
        :style="outerStyle(index, player)"
      >
        <!-- Inner content: absolutely positioned with swapped dimensions + rotation -->
        <div class="absolute flex flex-col" :style="innerStyle(index)">

          <!-- Dead overlay -->
          <Transition name="fade">
            <div v-if="player.isDead"
              class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl"
              style="background: rgba(255,255,255,0.85);">
              <v-icon name="fa-skull" scale="2.5" class="text-red-500" />
              <span class="text-red-500 text-sm font-bold uppercase tracking-widest">Eliminated</span>
            </div>
          </Transition>

          <!-- Name row -->
          <div class="flex items-center justify-between px-2 pt-1.5 pb-0.5 shrink-0 gap-2">
            <input v-model="player.name"
              class="bg-transparent text-xs font-bold uppercase tracking-widest min-w-0 flex-1 outline-none truncate"
              :style="`color: ${player.color};`" maxlength="14" />
            <div class="flex gap-1 shrink-0">
              <button v-for="color in PLAYER_COLORS" :key="color"
                class="w-3 h-3 rounded-full transition-transform"
                :style="`background:${color}; outline: 2px solid ${player.color === color ? color : 'transparent'}; outline-offset: 1px;`"
                :class="player.color === color ? 'scale-125' : ''"
                @click="player.color = color" />
            </div>
          </div>

          <!-- + zone -->
          <div class="flex-1 flex items-center justify-center cursor-pointer relative" style="min-height:0;"
            @pointerdown.prevent="startHold(player, +1)"
            @pointerup="endHold" @pointercancel="endHold" @pointerleave="endHold"
            @click="handleTap(player, +1)">
            <span class="font-bold select-none" :style="`font-size:${plusSize}px; color:${player.color}55`">+</span>
            <Transition name="fade">
              <span v-if="activeHoldPlayer === player.id && holdIsTen"
                class="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                :style="`background:${player.color}`">×10</span>
            </Transition>
          </div>

          <!-- Life total -->
          <div class="shrink-0 flex items-center justify-center relative py-1" style="z-index:1; pointer-events:none;">
            <Transition name="delta">
              <span v-if="player.showDelta" :key="player.deltaKey"
                class="absolute right-3 font-bold pointer-events-none"
                :class="player.delta > 0 ? 'text-emerald-500' : 'text-red-500'"
                :style="`font-size:${deltaSize}px`">
                {{ player.delta > 0 ? '+' : '' }}{{ player.delta }}
              </span>
            </Transition>
            <span class="font-display font-black leading-none tabular-nums"
              :style="`font-size:${lifeSize}px; color:${player.life <= 5 ? '#ef4444' : player.color};`">
              {{ player.life }}
            </span>
          </div>

          <!-- − zone -->
          <div class="flex-1 flex items-center justify-center cursor-pointer relative" style="min-height:0;"
            @pointerdown.prevent="startHold(player, -1)"
            @pointerup="endHold" @pointercancel="endHold" @pointerleave="endHold"
            @click="handleTap(player, -1)">
            <span class="font-bold select-none" :style="`font-size:${plusSize}px; color:${player.color}55`">−</span>
            <Transition name="fade">
              <span v-if="activeHoldPlayer === player.id && holdIsTen"
                class="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                :style="`background:${player.color}`">×10</span>
            </Transition>
          </div>

          <!-- Commander damage -->
          <div v-if="showCmdDamage" class="shrink-0 px-2 pb-1.5">
            <div class="flex flex-wrap gap-1 justify-center">
              <div v-for="opp in players.filter(p => p.id !== player.id)" :key="opp.id"
                class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                :style="`background:${opp.color}15; border:1px solid ${opp.color}35;`">
                <span class="text-[9px] font-bold max-w-[32px] truncate" :style="`color:${opp.color}`">{{ opp.name }}</span>
                <button class="w-4 h-4 flex items-center justify-center text-vault-muted rounded text-sm leading-none" @click.stop="changeCmdDamage(player, opp.id, -1)">−</button>
                <span class="text-[11px] font-bold w-4 text-center"
                  :class="(player.cmdDamage[opp.id] ?? 0) >= 21 ? 'text-red-500' : 'text-vault-text'">
                  {{ player.cmdDamage[opp.id] ?? 0 }}
                </span>
                <button class="w-4 h-4 flex items-center justify-center text-vault-muted rounded text-sm leading-none" @click.stop="changeCmdDamage(player, opp.id, +1)">+</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useElementSize } from '@vueuse/core'

interface Player {
  id: number; name: string; life: number; color: string; isDead: boolean
  cmdDamage: Record<number, number>; delta: number; deltaKey: number
  showDelta: boolean; deltaTimer: ReturnType<typeof setTimeout> | null
}

const PLAYER_COLORS = ['#7c3aed', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#db2777']
const PLAYER_NAMES  = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6']

const playerCount   = ref(4)
const startingLife  = ref(40)
const showCmdDamage = ref(false)

function makePlayer(id: number): Player {
  return { id, name: PLAYER_NAMES[id], life: startingLife.value, color: PLAYER_COLORS[id],
    isDead: false, cmdDamage: {}, delta: 0, deltaKey: 0, showDelta: false, deltaTimer: null }
}
const players = ref<Player[]>([0, 1, 2, 3].map(makePlayer))

// ── Layout configs ──────────────────────────────────────────────────────────
//
// Rotations are chosen so the player reading the panel sees it upright:
//   LEFT  column:  rotate(90deg)  → original "top" points screen-right  → readable from the left
//   RIGHT column:  rotate(-90deg) → original "top" points screen-left   → readable from the right
//   TOP panel:     rotate(180deg) → readable from the top
//   BOTTOM panel:  rotate(0deg)   → normal, readable from the bottom
//
// 2 players: top (180°) / bottom (0°)          — 1 column, 2 rows
// 3 players: left (90°) / right (-90°) / bottom-spanning (0°)  — 2 cols, 2 rows, row2 spans
// 4 players: left (90°) / right (-90°) × 2 rows                — 2 cols, 2 rows
// 5 players: like 4 + bottom-spanning (0°)                     — 2 cols, 3 rows, row3 spans
// 6 players: left (90°) / right (-90°) × 3 rows                — 2 cols, 3 rows

interface PanelCfg { rot: number; span?: boolean }

const configs = computed((): PanelCfg[] => {
  switch (playerCount.value) {
    case 2: return [
      { rot: 180 },
      { rot: 0 },
    ]
    case 3: return [
      { rot: 90 },
      { rot: -90 },
      { rot: 0, span: true },
    ]
    case 4: return [
      { rot: 90 }, { rot: -90 },
      { rot: 90 }, { rot: -90 },
    ]
    case 5: return [
      { rot: 90 }, { rot: -90 },
      { rot: 90 }, { rot: -90 },
      { rot: 0, span: true },
    ]
    case 6: return [
      { rot: 90 }, { rot: -90 },
      { rot: 90 }, { rot: -90 },
      { rot: 90 }, { rot: -90 },
    ]
    default: return []
  }
})

const gridClass = computed(() => playerCount.value === 2 ? 'grid-cols-1' : 'grid-cols-2')

// ── Cell dimensions via ResizeObserver ──────────────────────────────────────
const gridRef = ref<HTMLElement | null>(null)
const { width: gridW, height: gridH } = useElementSize(gridRef)

const PAD = 6  // p-1.5 = 6px each side
const GAP = 6  // gap-1.5

const gridCols = computed(() => playerCount.value === 2 ? 1 : 2)
const gridRows = computed(() => {
  if (playerCount.value <= 2) return 2
  if (playerCount.value <= 4) return 2
  return 3
})

// Dimensions of a single (non-spanning) grid cell
const cellW = computed(() => (gridW.value - PAD * 2 - GAP * (gridCols.value - 1)) / gridCols.value)
const cellH = computed(() => (gridH.value - PAD * 2 - GAP * (gridRows.value - 1)) / gridRows.value)

// ── Panel styles ────────────────────────────────────────────────────────────
function outerStyle(index: number, player: Player): string {
  const cfg = configs.value[index]
  const span = cfg?.span ? 'grid-column: 1 / -1;' : ''
  return `background:${player.color}12; border:1.5px solid ${player.color}40; ${span}`
}

function innerStyle(index: number): string {
  const cfg = configs.value[index]
  if (!cfg) return 'inset:0;'
  const { rot } = cfg
  const w = cellW.value
  const h = cellH.value

  // 0° and 180°: content has same dimensions as cell — no swap needed
  if (rot === 0)   return 'inset:0;'
  if (rot === 180) return 'inset:0; transform:rotate(180deg);'

  // ±90°: to visually fill a W×H cell, the inner div must be H×W before rotation,
  // then centered in the cell. After rotation it maps exactly onto W×H.
  if (w <= 0 || h <= 0) return 'inset:0;'
  return `width:${h}px; height:${w}px; top:50%; left:50%; transform:translate(-50%,-50%) rotate(${rot}deg);`
}

// ── Text sizes — based on the "readable width" of a typical panel ───────────
// For ±90° panels the readable width is cellH (it becomes the content width after rotation).
// For 0°/180° panels the readable width is cellW.
const readableW = computed(() => {
  const cfg = configs.value[0]
  if (!cfg) return 100
  return Math.abs(cfg.rot) === 90 ? cellH.value : cellW.value
})

const lifeSize  = computed(() => Math.max(28, Math.min(readableW.value * 0.62, 128)))
const plusSize  = computed(() => Math.max(20, Math.min(readableW.value * 0.36, 72)))
const deltaSize = computed(() => Math.max(14, Math.min(readableW.value * 0.18, 36)))

// ── Life management ─────────────────────────────────────────────────────────
function setPlayerCount(n: number) {
  playerCount.value = n
  while (players.value.length < n) players.value.push(makePlayer(players.value.length))
  players.value = players.value.slice(0, n)
}
function setStartingLife(life: number) {
  startingLife.value = life
  players.value.forEach(p => { p.life = life; p.isDead = false; p.cmdDamage = {}; p.delta = 0; p.showDelta = false })
}
function changeLife(player: Player, delta: number) {
  player.life += delta
  player.delta += delta
  player.deltaKey++
  player.showDelta = true
  player.isDead = player.life <= 0 || Object.values(player.cmdDamage).some(d => d >= 21)
  if (player.deltaTimer) clearTimeout(player.deltaTimer)
  player.deltaTimer = setTimeout(() => { player.showDelta = false; player.delta = 0 }, 1500)
}
function changeCmdDamage(player: Player, fromId: number, delta: number) {
  const prev = player.cmdDamage[fromId] ?? 0
  player.cmdDamage[fromId] = Math.max(0, prev + delta)
  if (delta !== 0) changeLife(player, -delta)
  player.isDead = player.life <= 0 || Object.values(player.cmdDamage).some(d => d >= 21)
}

// ── Hold / long-press ───────────────────────────────────────────────────────
let holdInterval: ReturnType<typeof setInterval> | null = null
let holdTimeout:  ReturnType<typeof setTimeout>  | null = null
let longPressConsumed = false
const activeHoldPlayer = ref<number | null>(null)
const holdIsTen = ref(false)

function startHold(player: Player, delta: number) {
  endHold()
  longPressConsumed = false
  holdTimeout = setTimeout(() => {
    holdIsTen.value = true
    activeHoldPlayer.value = player.id
    longPressConsumed = true
    changeLife(player, delta * 10)
    holdInterval = setInterval(() => changeLife(player, delta * 10), 200)
  }, 500)
}
function endHold() {
  if (holdTimeout)  { clearTimeout(holdTimeout);   holdTimeout  = null }
  if (holdInterval) { clearInterval(holdInterval); holdInterval = null }
  holdIsTen.value = false
  activeHoldPlayer.value = null
}
function handleTap(player: Player, delta: number) {
  if (longPressConsumed) { longPressConsumed = false; return }
  changeLife(player, delta)
}
function confirmReset() {
  if (!confirm('Reset all life totals?')) return
  players.value.forEach(p => { p.life = startingLife.value; p.isDead = false; p.cmdDamage = {}; p.delta = 0; p.showDelta = false })
}

onUnmounted(endHold)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.delta-enter-active { transition: opacity 0.1s, transform 0.1s; }
.delta-leave-active { transition: opacity 1.2s, transform 1.2s; }
.delta-enter-from   { opacity: 0; transform: translateY(6px); }
.delta-leave-to     { opacity: 0; transform: translateY(-28px); }
</style>
