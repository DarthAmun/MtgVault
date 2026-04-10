<template>
  <div class="p-4 md:p-6 space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <NuxtLink to="/game-tools" class="text-xs text-vault-muted hover:text-vault-accent flex items-center gap-1 mb-1">
          <v-icon name="fa-chevron-left" scale="0.7" /> Game Tools
        </NuxtLink>
        <h1 class="font-display text-3xl text-vault-gold">Big Bad PvE</h1>
        <p class="text-vault-muted text-sm mt-1">Co-op mode — track the Big Bad's board state</p>
      </div>
      <button
        class="px-3 py-2 rounded-xl text-xs font-bold text-vault-muted hover:text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1.5"
        @click="confirmReset"
      >
        <v-icon name="fa-undo" scale="0.75" /> New Game
      </button>
    </div>

    <!-- Phase banner -->
    <div
      class="rounded-xl px-4 py-2 text-center text-sm font-bold uppercase tracking-widest"
      :style="`background: ${currentPhase.color}15; border: 1px solid ${currentPhase.color}40; color: ${currentPhase.color}`"
    >
      {{ currentPhase.emoji }} Phase {{ boss.phase }} — {{ currentPhase.name }}
    </div>

    <div class="grid md:grid-cols-2 gap-4">

      <!-- ── Big Bad panel ──────────────────────────────────────────────── -->
      <div class="vault-card p-5 space-y-5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <v-icon name="fa-dragon" scale="1.1" class="shrink-0" style="color:#b45309" />
            <input
              v-model="boss.name"
              class="bg-transparent font-display text-lg font-bold text-vault-text outline-none min-w-0 truncate"
              placeholder="Big Bad Name"
              maxlength="24"
            />
          </div>
          <div class="flex gap-1 shrink-0">
            <button
              v-for="p in phases"
              :key="p.num"
              class="w-7 h-7 rounded-lg text-xs font-bold transition-colors"
              :class="boss.phase === p.num ? 'text-white' : 'text-vault-muted hover:bg-vault-surface2'"
              :style="boss.phase === p.num ? `background:${p.color}` : ''"
              @click="boss.phase = p.num"
            >{{ p.num }}</button>
          </div>
        </div>

        <!-- HP bar -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-vault-muted uppercase tracking-wider">Hit Points</span>
            <span class="text-2xl font-black" :class="boss.hp <= 0 ? 'text-emerald-500' : 'text-vault-text'">
              {{ Math.max(0, boss.hp) }} / {{ boss.maxHp }}
            </span>
          </div>
          <div class="h-3 bg-vault-surface3 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="`width:${Math.max(0, (boss.hp / boss.maxHp) * 100)}%; background: linear-gradient(90deg, ${currentPhase.color}, #dc2626)`"
            />
          </div>
          <div class="flex items-center gap-2 mt-2">
            <input v-model.number="damageAmount" type="number" min="1" max="999"
              class="w-16 text-center text-sm font-bold bg-vault-surface2 rounded-lg px-2 py-1 border border-vault-border outline-none focus:border-violet-400" />
            <button class="flex-1 py-1.5 rounded-lg text-xs font-bold bg-vault-surface2 hover:bg-red-100 hover:text-red-600 transition-colors"
              @click="dealDamage">
              Deal {{ damageAmount }} damage
            </button>
            <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-vault-surface2 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
              @click="healBoss">
              Heal
            </button>
          </div>
        </div>

        <!-- Max HP config -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-vault-muted shrink-0">Max HP:</span>
          <input v-model.number="boss.maxHp" type="number" min="1" max="9999"
            class="w-20 text-sm font-bold bg-vault-surface2 rounded-lg px-2 py-1 border border-vault-border outline-none focus:border-violet-400"
            @change="boss.hp = Math.min(boss.hp, boss.maxHp)" />
          <button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-vault-surface2 hover:bg-vault-surface3 transition-colors"
            @click="boss.hp = boss.maxHp">
            Full Heal
          </button>
        </div>

        <!-- Status effects -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-vault-muted uppercase tracking-wider">Status Effects</span>
            <button class="text-xs text-vault-accent hover:underline" @click="showAddStatus = true">+ Add</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <div v-if="!boss.statuses.length" class="text-xs text-vault-dim">None</div>
            <div
              v-for="(s, i) in boss.statuses"
              :key="i"
              class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border cursor-pointer hover:opacity-70 transition-opacity"
              :style="`background:${s.color}15; border-color:${s.color}40; color:${s.color}`"
              @click="boss.statuses.splice(i, 1)"
            >
              {{ s.emoji }} {{ s.label }}
            </div>
          </div>

          <!-- Add status inline -->
          <div v-if="showAddStatus" class="flex gap-1.5 mt-2">
            <input v-model="newStatus.emoji" class="w-10 text-center text-sm bg-vault-surface2 rounded-lg px-1 py-1 border border-vault-border outline-none focus:border-violet-400" placeholder="🔥" maxlength="2" />
            <input v-model="newStatus.label" class="flex-1 text-sm bg-vault-surface2 rounded-lg px-2 py-1 border border-vault-border outline-none focus:border-violet-400" placeholder="Burning" maxlength="16" />
            <button class="px-3 py-1 rounded-lg text-xs font-bold bg-vault-accent text-white hover:bg-violet-700 transition-colors" @click="addStatus">Add</button>
            <button class="px-2 py-1 rounded-lg text-xs font-bold text-vault-muted hover:bg-vault-surface2 transition-colors" @click="showAddStatus = false">✕</button>
          </div>
        </div>

        <!-- Boss notes -->
        <div>
          <span class="text-xs text-vault-muted uppercase tracking-wider block mb-1.5">Notes / Board State</span>
          <textarea
            v-model="boss.notes"
            rows="3"
            placeholder="Active abilities, ongoing effects, triggers…"
            class="w-full text-sm bg-vault-surface2 rounded-xl px-3 py-2 border border-vault-border outline-none focus:border-violet-400 resize-none leading-relaxed"
          />
        </div>
      </div>

      <!-- ── Players panel ──────────────────────────────────────────────── -->
      <div class="vault-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-bold text-emerald-700">Players</h2>
          <div class="flex gap-1">
            <button v-for="n in [1,2,3,4,5]" :key="n"
              class="w-6 h-6 rounded text-xs font-bold transition-colors"
              :class="playerCount === n ? 'bg-violet-600 text-white' : 'text-vault-muted hover:bg-violet-50'"
              @click="setPlayerCount(n)">{{ n }}</button>
          </div>
        </div>

        <div class="space-y-2">
          <div v-for="(p, i) in players" :key="i"
            class="p-2.5 rounded-xl space-y-1.5"
            :style="`background:${p.color}10; border:1px solid ${p.color}25`">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full shrink-0" :style="`background:${p.color}`" />
              <input v-model="p.name" class="bg-transparent text-sm font-bold min-w-0 flex-1 outline-none" :style="`color:${p.color}`" maxlength="12" />
              <div v-if="p.life <= 0" class="text-xs font-bold text-red-500">☠</div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <!-- Life -->
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-vault-muted w-5">❤</span>
                <button class="w-6 h-6 rounded-lg text-vault-dim hover:text-vault-accent text-sm flex items-center justify-center"
                  @click="p.life = Math.max(0, p.life - 1)">−</button>
                <span class="text-xl font-black w-8 text-center tabular-nums"
                  :class="p.life <= 5 ? 'text-red-500' : 'text-vault-text'">{{ p.life }}</span>
                <button class="w-6 h-6 rounded-lg text-vault-dim hover:text-vault-accent text-sm flex items-center justify-center"
                  @click="p.life++">+</button>
              </div>
              <!-- Poison -->
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-vault-muted">☠</span>
                <button class="w-6 h-6 rounded-lg text-vault-dim hover:text-vault-accent text-sm flex items-center justify-center"
                  @click="p.poison = Math.max(0, p.poison - 1)">−</button>
                <span class="text-lg font-black w-6 text-center tabular-nums"
                  :class="p.poison >= 10 ? 'text-red-500' : 'text-vault-dim'">{{ p.poison }}</span>
                <button class="w-6 h-6 rounded-lg text-vault-dim hover:text-vault-accent text-sm flex items-center justify-center"
                  @click="p.poison++">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Combined life -->
        <div class="pt-2 border-t border-vault-border">
          <div class="flex justify-between text-sm">
            <span class="text-vault-muted">Combined life</span>
            <span class="font-bold" :class="totalLife <= 0 ? 'text-red-500' : 'text-vault-text'">
              {{ totalLife }}
              <span v-if="totalLife <= 0" class="ml-1 font-normal">— Players Lose!</span>
            </span>
          </div>
        </div>

        <!-- Round tracker -->
        <div class="pt-2 border-t border-vault-border flex items-center justify-between">
          <span class="text-xs text-vault-muted uppercase tracking-wider">Round</span>
          <div class="flex items-center gap-2">
            <button class="w-7 h-7 rounded-lg bg-vault-surface2 hover:bg-vault-surface3 text-sm font-bold flex items-center justify-center transition-colors"
              @click="round = Math.max(1, round - 1)">−</button>
            <span class="text-xl font-black w-8 text-center">{{ round }}</span>
            <button class="w-7 h-7 rounded-lg bg-vault-surface2 hover:bg-vault-surface3 text-sm font-bold flex items-center justify-center transition-colors"
              @click="round++">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Turn log -->
    <div class="vault-card p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-vault-text">Event Log</h3>
        <button class="text-xs text-vault-muted hover:text-red-500 transition-colors" @click="log = []">Clear</button>
      </div>
      <div v-if="!log.length" class="text-xs text-vault-dim text-center py-4">No events yet</div>
      <div class="space-y-1 max-h-40 overflow-y-auto">
        <div v-for="(entry, i) in [...log].reverse()" :key="i"
          class="text-xs text-vault-muted flex items-baseline gap-2">
          <span class="text-vault-dim shrink-0">R{{ entry.round }}</span>
          <span>{{ entry.msg }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
const PLAYER_COLORS = ['#7c3aed', '#2563eb', '#dc2626', '#16a34a', '#d97706']
const STARTING_LIFE = 40

interface Phase { num: number; name: string; color: string; emoji: string }
const phases: Phase[] = [
  { num: 1, name: 'Normal',   color: '#b45309', emoji: '🐉' },
  { num: 2, name: 'Enraged',  color: '#dc2626', emoji: '💢' },
  { num: 3, name: 'Desperate', color: '#7c3aed', emoji: '☠' },
]

interface Status { label: string; emoji: string; color: string }
const STATUS_COLORS = ['#dc2626', '#d97706', '#7c3aed', '#2563eb', '#16a34a']

const boss = reactive({
  name: 'The Big Bad',
  hp: 100,
  maxHp: 100,
  phase: 1,
  statuses: [] as Status[],
  notes: '',
})

const currentPhase = computed(() => phases.find(p => p.num === boss.phase) ?? phases[0])

const damageAmount = ref(1)
const round = ref(1)
const showAddStatus = ref(false)
const newStatus = reactive({ emoji: '', label: '' })

interface LogEntry { round: number; msg: string }
const log = ref<LogEntry[]>([])

function addLog(msg: string) {
  log.value.push({ round: round.value, msg })
}

function dealDamage() {
  const prev = boss.hp
  boss.hp = Math.max(0, boss.hp - damageAmount.value)
  addLog(`Big Bad took ${damageAmount.value} damage (${prev} → ${boss.hp} HP)`)
  if (boss.hp <= 0) addLog('🎉 Big Bad defeated!')
}

function healBoss() {
  const prev = boss.hp
  boss.hp = Math.min(boss.maxHp, boss.hp + damageAmount.value)
  addLog(`Big Bad healed ${boss.hp - prev} HP (→ ${boss.hp} HP)`)
}

function addStatus() {
  if (!newStatus.label.trim()) return
  boss.statuses.push({
    label: newStatus.label.trim(),
    emoji: newStatus.emoji || '⚡',
    color: STATUS_COLORS[boss.statuses.length % STATUS_COLORS.length],
  })
  newStatus.emoji = ''
  newStatus.label = ''
  showAddStatus.value = false
}

// ── Players ──────────────────────────────────────────────────────────────────
interface Player { name: string; life: number; poison: number; color: string }
const playerCount = ref(2)
const players = ref<Player[]>(
  PLAYER_COLORS.slice(0, 2).map((color, i) => ({ name: `Player ${i + 1}`, life: STARTING_LIFE, poison: 0, color }))
)

const totalLife = computed(() => players.value.reduce((s, p) => s + p.life, 0))

function setPlayerCount(n: number) {
  playerCount.value = n
  while (players.value.length < n) {
    const i = players.value.length
    players.value.push({ name: `Player ${i + 1}`, life: STARTING_LIFE, poison: 0, color: PLAYER_COLORS[i] })
  }
  players.value = players.value.slice(0, n)
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function confirmReset() {
  if (!confirm('Start a new game? This will reset everything.')) return
  boss.hp = boss.maxHp
  boss.phase = 1
  boss.statuses = []
  boss.notes = ''
  round.value = 1
  players.value.forEach(p => { p.life = STARTING_LIFE; p.poison = 0 })
  log.value = []
}
</script>
