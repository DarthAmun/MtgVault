<template>
  <div class="p-4 md:p-6 space-y-5">

    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <NuxtLink to="/game-tools" class="text-xs text-vault-muted hover:text-vault-accent flex items-center gap-1 mb-1">
          <v-icon name="fa-chevron-left" scale="0.7" /> Game Tools
        </NuxtLink>
        <h1 class="font-display text-3xl text-vault-gold">Against the Horde</h1>
        <p class="text-vault-muted text-sm mt-1">Survivors vs. an automated zombie horde</p>
      </div>
      <button v-if="gamePhase !== 'setup'"
        class="px-3 py-2 rounded-xl text-xs font-bold text-vault-muted hover:text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1.5"
        @click="confirmReset">
        <v-icon name="fa-undo" scale="0.75" /> New Game
      </button>
    </div>

    <!-- ══════════════════════════ SETUP ══════════════════════════════════ -->
    <template v-if="gamePhase === 'setup'">
      <div class="grid md:grid-cols-2 gap-4">
        <!-- Deck picker -->
        <div class="vault-card p-5 space-y-4">
          <h2 class="font-display text-lg font-bold text-vault-text">Select Horde Deck</h2>
          <div v-if="loadingDecks" class="flex items-center gap-2 text-vault-muted text-sm py-4">
            <v-icon name="fa-spinner" class="animate-spin" scale="0.9" /> Loading decks…
          </div>
          <div v-else-if="!hordeDecks.length" class="text-center py-6 space-y-3">
            <v-icon name="fa-skull" scale="2" class="text-vault-dim" />
            <p class="text-sm text-vault-muted">No horde decks yet.</p>
            <p class="text-xs text-vault-dim">Create a deck with the <strong>horde</strong> format in the Decks tab, then come back here.</p>
            <NuxtLink to="/decks"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-vault-accent text-white text-sm font-bold hover:bg-violet-700 transition-colors">
              <v-icon name="fa-plus" scale="0.85" /> Create Horde Deck
            </NuxtLink>
          </div>
          <div v-else class="space-y-2">
            <button v-for="deck in hordeDecks" :key="deck.id"
              class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
              :class="selectedDeckId === deck.id ? 'border-violet-500 bg-violet-50' : 'border-vault-border hover:border-violet-300'"
              @click="selectedDeckId = deck.id">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                :style="selectedDeckId === deck.id ? 'background:#7c3aed' : 'background:#e5e3f0'">
                <v-icon name="fa-skull" scale="0.9" :style="selectedDeckId === deck.id ? 'color:white' : 'color:#6b21a8'" />
              </div>
              <div class="min-w-0">
                <p class="font-bold text-sm text-vault-text truncate">{{ deck.name }}</p>
                <p class="text-xs text-vault-muted">{{ deckCardCount(deck) }} cards</p>
              </div>
              <div v-if="selectedDeckId === deck.id" class="shrink-0 ml-auto text-violet-600">
                <v-icon name="fa-check" scale="0.9" />
              </div>
            </button>
          </div>
        </div>

        <!-- Game options -->
        <div class="vault-card p-5 space-y-5">
          <h2 class="font-display text-lg font-bold text-vault-text">Game Setup</h2>
          <div>
            <label class="text-xs text-vault-muted uppercase tracking-wider block mb-2">Survivors</label>
            <div class="flex gap-1.5">
              <button v-for="n in [1,2,3,4,5]" :key="n"
                class="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
                :class="setupSurvivorCount === n ? 'bg-violet-600 text-white' : 'text-vault-muted hover:bg-violet-50 border border-vault-border'"
                @click="setupSurvivorCount = n">{{ n }}</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-vault-muted uppercase tracking-wider block mb-2">Starting Life</label>
            <div class="flex gap-1.5">
              <button v-for="life in [20, 40, 60, 80]" :key="life"
                class="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
                :class="setupStartingLife === life ? 'bg-violet-600 text-white' : 'text-vault-muted hover:bg-violet-50 border border-vault-border'"
                @click="setupStartingLife = life">{{ life }}</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-vault-muted uppercase tracking-wider block mb-1">
              Horde draw steps per turn
              <span class="normal-case font-normal ml-1 text-vault-dim">(official: 1 per 2 survivors)</span>
            </label>
            <div class="flex items-center gap-2">
              <button class="w-8 h-8 rounded-lg bg-vault-surface2 hover:bg-vault-surface3 font-bold flex items-center justify-center"
                @click="setupDrawSteps = Math.max(1, setupDrawSteps - 1)">−</button>
              <span class="text-xl font-black w-8 text-center">{{ setupDrawSteps }}</span>
              <button class="w-8 h-8 rounded-lg bg-vault-surface2 hover:bg-vault-surface3 font-bold flex items-center justify-center"
                @click="setupDrawSteps++">+</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-vault-muted uppercase tracking-wider block mb-1">Free survivor turns at start</label>
            <div class="flex items-center gap-2">
              <button class="w-8 h-8 rounded-lg bg-vault-surface2 hover:bg-vault-surface3 font-bold flex items-center justify-center"
                @click="setupFreeTurns = Math.max(0, setupFreeTurns - 1)">−</button>
              <span class="text-xl font-black w-8 text-center">{{ setupFreeTurns }}</span>
              <button class="w-8 h-8 rounded-lg bg-vault-surface2 hover:bg-vault-surface3 font-bold flex items-center justify-center"
                @click="setupFreeTurns++">+</button>
            </div>
          </div>
          <!-- Advanced options collapsible -->
          <details class="border border-vault-border rounded-xl overflow-hidden">
            <summary class="cursor-pointer px-3 py-2 text-xs font-bold text-vault-muted select-none hover:bg-vault-surface2 transition-colors">
              Advanced Options
            </summary>
            <div class="px-3 pb-3 pt-2 space-y-3 border-t border-vault-border">

              <!-- Deck size -->
              <div>
                <label class="text-xs text-vault-muted uppercase tracking-wider block mb-1.5">Deck Size</label>
                <div class="flex gap-1">
                  <button v-for="pct in [50, 75, 100, 200]" :key="pct"
                    class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    :class="setupDeckSize === pct ? 'bg-violet-600 text-white' : 'text-vault-muted hover:bg-violet-50 border border-vault-border'"
                    @click="setupDeckSize = pct">{{ pct }}%</button>
                </div>
              </div>

              <!-- Token multiplier -->
              <div>
                <label class="text-xs text-vault-muted uppercase tracking-wider block mb-1.5">Token Multiplier</label>
                <div class="flex gap-1">
                  <button v-for="m in [1, 2, 3, 4]" :key="m"
                    class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    :class="setupTokenMultiplier === m ? 'bg-violet-600 text-white' : 'text-vault-muted hover:bg-violet-50 border border-vault-border'"
                    @click="setupTokenMultiplier = m">×{{ m }}</button>
                </div>
              </div>

              <!-- Safe zone -->
              <div class="flex items-start gap-3">
                <label class="flex items-center gap-2 cursor-pointer mt-0.5">
                  <input type="checkbox" v-model="setupSafeZone" class="accent-violet-600 w-4 h-4" />
                  <span class="text-xs font-bold text-vault-text">Safe Zone</span>
                </label>
                <div v-if="setupSafeZone" class="flex gap-1 ml-auto">
                  <button v-for="sz in (['default','reduced'] as const)" :key="sz"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors"
                    :class="setupSafeZoneSize === sz ? 'bg-violet-600 text-white' : 'text-vault-muted hover:bg-violet-50 border border-vault-border'"
                    @click="setupSafeZoneSize = sz">{{ sz }}</button>
                </div>
              </div>
              <p v-if="setupSafeZone" class="text-[10px] text-vault-dim -mt-1">
                Tokens fill the first {{ setupSafeZoneSize === 'reduced' ? '10' : '20' }} card positions so survivors have breathing room.
              </p>

              <!-- Alternative draw mode -->
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" v-model="setupAltDrawMode" class="accent-violet-600 w-4 h-4" />
                  <span class="text-xs font-bold text-vault-text">Alt Draw Mode</span>
                </label>
                <div v-if="setupAltDrawMode" class="flex items-center gap-1.5 ml-auto">
                  <button class="w-6 h-6 rounded-lg bg-vault-surface2 font-bold text-xs flex items-center justify-center"
                    @click="setupAltDrawCount = Math.max(1, setupAltDrawCount - 1)">−</button>
                  <span class="text-sm font-black w-5 text-center">{{ setupAltDrawCount }}</span>
                  <button class="w-6 h-6 rounded-lg bg-vault-surface2 font-bold text-xs flex items-center justify-center"
                    @click="setupAltDrawCount++">+</button>
                  <span class="text-[10px] text-vault-muted">cards/step</span>
                </div>
              </div>
              <p v-if="setupAltDrawMode" class="text-[10px] text-vault-dim -mt-1">
                Draw exactly {{ setupAltDrawCount }} card{{ setupAltDrawCount !== 1 ? 's' : '' }} per step instead of revealing until a non-token.
              </p>

              <!-- Horde lifepoints -->
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" v-model="setupHordeLifepoints" class="accent-violet-600 w-4 h-4" />
                  <span class="text-xs font-bold text-vault-text">Horde Has Lifepoints</span>
                </label>
                <div v-if="setupHordeLifepoints" class="flex items-center gap-1.5 ml-auto">
                  <button class="w-6 h-6 rounded-lg bg-vault-surface2 font-bold text-xs flex items-center justify-center"
                    @click="setupHordeHP = Math.max(10, setupHordeHP - 10)">−</button>
                  <span class="text-sm font-black w-8 text-center tabular-nums">{{ setupHordeHP }}</span>
                  <button class="w-6 h-6 rounded-lg bg-vault-surface2 font-bold text-xs flex items-center justify-center"
                    @click="setupHordeHP += 10">+</button>
                  <span class="text-[10px] text-vault-muted">HP</span>
                </div>
              </div>
              <p v-if="setupHordeLifepoints" class="text-[10px] text-vault-dim -mt-1">
                Damage depletes HP first. Milling only begins when HP reaches 0.
              </p>

            </div>
          </details>

          <button
            class="w-full py-3 rounded-xl font-bold text-sm transition-colors"
            :class="selectedDeckId && !loadingGame
              ? 'bg-gradient-to-r from-[#1a1a2e] to-[#6b21a8] text-white hover:opacity-90'
              : 'bg-vault-surface2 text-vault-dim cursor-not-allowed'"
            :disabled="!selectedDeckId || loadingGame"
            @click="startGame">
            <span v-if="loadingGame" class="flex items-center justify-center gap-2">
              <v-icon name="fa-spinner" class="animate-spin" scale="0.85" /> Shuffling deck…
            </span>
            <span v-else>☠ Start Game</span>
          </button>
        </div>
      </div>

      <details class="vault-card p-4">
        <summary class="cursor-pointer text-sm font-bold text-vault-text select-none">Quick Rules Reference</summary>
        <div class="mt-3 space-y-2 text-xs text-vault-muted leading-relaxed">
          <p><strong class="text-vault-text">Setup:</strong> Build a 100-card Horde deck (60 zombie tokens + 40 action cards). Set format to <em>horde</em> in the Decks tab.</p>
          <p><strong class="text-vault-text">Horde Turn:</strong> Play hand cards first, then reveal until a non-token. All revealed cards enter tapped and attack.</p>
          <p><strong class="text-vault-text">Survivors' Turn:</strong> Deal damage to mill cards. Kill creatures by blocking.</p>
          <p><strong class="text-vault-text">Winning:</strong> Survivors win when library = 0. Horde wins if combined survivor life = 0.</p>
          <p><a href="https://hordemagic.com/basic-horde-rules/" target="_blank" class="text-vault-accent hover:underline">Full rules at hordemagic.com →</a></p>
        </div>
      </details>
    </template>

    <!-- ══════════════════════════ GAME ═══════════════════════════════════ -->
    <template v-else>

      <!-- Phase banner -->
      <div
        class="rounded-xl px-4 py-2.5 text-center text-sm font-bold uppercase tracking-widest transition-colors"
        :class="isHordeTurn ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'">
        {{ isHordeTurn ? '☠ Horde Turn' : '⚔ Survivors\' Turn' }}
        <span class="font-normal opacity-60 ml-2">· Round {{ round }}</span>
        <span v-if="freeTurnsLeft > 0" class="ml-2 font-normal text-amber-600 opacity-100">
          · Free turn {{ setupFreeTurns - freeTurnsLeft + 1 }}/{{ setupFreeTurns }}
        </span>
      </div>

      <!-- Info row — 4 zones -->
      <div class="grid grid-cols-4 gap-2 text-center">
        <div class="vault-card p-3">
          <p class="text-2xl font-black" :class="library.length === 0 ? 'text-emerald-500' : 'text-vault-text'">{{ library.length }}</p>
          <p class="text-xs text-vault-muted mt-0.5">Library</p>
          <div class="h-1 bg-vault-surface3 rounded-full mt-1.5 overflow-hidden">
            <div class="h-full rounded-full" style="background:linear-gradient(90deg,#6b21a8,#dc2626)"
              :style="`width:${deckSize ? Math.max(0,(library.length/deckSize)*100) : 0}%`" />
          </div>
        </div>
        <div class="vault-card p-3 cursor-pointer" @click="showHand = !showHand">
          <p class="text-2xl font-black text-violet-600">{{ hand.length }}</p>
          <p class="text-xs text-vault-muted mt-0.5">Hand 🤫</p>
        </div>
        <div class="vault-card p-3">
          <p class="text-2xl font-black text-vault-text">{{ battlefield.length }}</p>
          <p class="text-xs text-vault-muted mt-0.5">Battlefield</p>
        </div>
        <div class="vault-card p-3 cursor-pointer" @click="showGraveyard = !showGraveyard">
          <p class="text-2xl font-black text-vault-dim">{{ graveyard.length }}</p>
          <p class="text-xs text-vault-muted mt-0.5">Graveyard</p>
        </div>
      </div>

      <!-- Main two-column area -->
      <div class="grid md:grid-cols-2 gap-4">

        <!-- Horde controls -->
        <div class="vault-card p-5 space-y-4">
          <h2 class="font-display text-lg font-bold" style="color:#6b21a8">The Horde</h2>

          <!-- Horde HP bar (optional rule) -->
          <div v-if="hordeLifepoints" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-vault-muted uppercase tracking-wider">Horde HP</span>
              <span class="font-black tabular-nums" :class="hordeHP <= 0 ? 'text-emerald-500' : 'text-red-500'">
                {{ Math.max(0, hordeHP) }} / {{ hordeMaxHP }}
              </span>
            </div>
            <div class="h-2.5 bg-vault-surface3 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                style="background:linear-gradient(90deg,#dc2626,#991b1b)"
                :style="`width:${hordeMaxHP ? Math.max(0,(hordeHP/hordeMaxHP)*100) : 0}%`" />
            </div>
            <p v-if="hordeHP <= 0" class="text-xs text-emerald-600 font-bold text-center">HP depleted — damage now mills!</p>
          </div>

          <!-- Horde turn actions -->
          <template v-if="isHordeTurn">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs text-vault-muted">
                <span>Draw steps</span>
                <span>{{ drawsDoneThisTurn }} / {{ setupDrawSteps }}</span>
              </div>
              <button
                class="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                :class="canDraw ? 'bg-gradient-to-r from-[#1a1a2e] to-[#6b21a8] hover:opacity-90 active:scale-95' : 'bg-vault-surface2 text-vault-dim cursor-not-allowed'"
                :disabled="!canDraw"
                @click="drawStep">
                {{ drawsDoneThisTurn >= setupDrawSteps ? '✓ All draws done' : `☠ Draw Step ${drawsDoneThisTurn + 1}` }}
              </button>
              <div v-if="revealedThisTurn.size > 0" class="text-xs text-vault-muted text-center">
                {{ revealedThisTurn.size }} card{{ revealedThisTurn.size !== 1 ? 's' : '' }} revealed this turn
              </div>
            </div>
            <!-- Draw to hand -->
            <button
              class="w-full py-2 rounded-xl text-xs font-bold transition-colors border"
              :class="library.length > 0
                ? 'border-violet-300 text-violet-700 hover:bg-violet-50'
                : 'border-vault-border text-vault-dim cursor-not-allowed'"
              :disabled="library.length === 0"
              @click="drawToHand">
              🤫 Draw 1 card to Hand (hidden)
            </button>
            <div class="border-t border-vault-border pt-3">
              <button
                class="w-full py-2.5 rounded-xl font-bold text-sm transition-colors"
                :class="drawsDoneThisTurn > 0 || freeTurnsLeft > 0
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-vault-surface2 text-vault-dim cursor-not-allowed'"
                :disabled="drawsDoneThisTurn === 0 && freeTurnsLeft === 0"
                @click="endHordeTurn">
                ⚔ End Horde Turn → Survivors Act
              </button>
            </div>
          </template>

          <!-- Survivors' turn actions -->
          <template v-else>
            <div class="space-y-2">
              <label class="text-xs text-vault-muted uppercase tracking-wider block">Deal damage → mill cards</label>
              <div class="flex items-center gap-2">
                <input v-model.number="damageAmount" type="number" min="1" max="999"
                  class="w-16 text-center font-bold bg-vault-surface2 rounded-lg px-2 py-1.5 border border-vault-border outline-none focus:border-violet-400" />
                <button
                  class="flex-1 py-2 rounded-xl text-sm font-bold bg-vault-surface2 hover:bg-red-100 hover:text-red-600 transition-colors"
                  @click="dealDamage">
                  <template v-if="hordeLifepoints && hordeHP > 0">
                    Deal {{ damageAmount }} Damage
                  </template>
                  <template v-else>
                    Mill {{ damageAmount }} card{{ damageAmount !== 1 ? 's' : '' }}
                  </template>
                </button>
              </div>
              <p v-if="library.length === 0" class="text-emerald-600 font-bold text-sm text-center">🎉 Horde defeated!</p>
            </div>
            <div class="border-t border-vault-border pt-3">
              <button
                class="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#1a1a2e] to-[#6b21a8] text-white hover:opacity-90 transition-all"
                @click="endSurvivorTurn">
                ☠ End Survivors' Turn → Horde Acts
              </button>
            </div>
          </template>
        </div>

        <!-- Survivors -->
        <div class="vault-card p-5 space-y-4">
          <h2 class="font-display text-lg font-bold text-emerald-700">Survivors</h2>
          <div class="space-y-2">
            <div v-for="(s, i) in survivors" :key="i"
              class="flex items-center gap-3 p-2.5 rounded-xl"
              :style="`background:${s.color}10;border:1px solid ${s.color}25`">
              <div class="w-2 h-2 rounded-full shrink-0" :style="`background:${s.color}`" />
              <input v-model="s.name" class="bg-transparent text-sm font-bold min-w-0 flex-1 outline-none truncate" :style="`color:${s.color}`" maxlength="12" />
              <div class="flex items-center gap-1 shrink-0">
                <button class="w-6 h-6 rounded-lg text-vault-dim hover:text-vault-accent text-sm flex items-center justify-center"
                  @click="s.life = Math.max(0, s.life - 1)">−</button>
                <span class="text-xl font-black w-8 text-center tabular-nums"
                  :class="s.life <= 5 ? 'text-red-500' : 'text-vault-text'">{{ s.life }}</span>
                <button class="w-6 h-6 rounded-lg text-vault-dim hover:text-vault-accent text-sm flex items-center justify-center"
                  @click="s.life++">+</button>
              </div>
              <div v-if="s.life <= 0" class="text-xs font-bold text-red-500">☠</div>
            </div>
          </div>
          <div class="pt-2 border-t border-vault-border flex justify-between text-sm">
            <span class="text-vault-muted">Combined life</span>
            <span class="font-bold" :class="totalSurvivorLife <= 0 ? 'text-red-500' : 'text-vault-text'">
              {{ totalSurvivorLife }}
              <span v-if="totalSurvivorLife <= 0" class="font-normal ml-1">— Survivors Lose!</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ══ Hand (hidden zone — panel only opens on explicit tap) ══════════ -->
      <div v-if="showHand" class="vault-card p-4 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display text-lg font-bold text-violet-700">
            🤫 Hand
            <span class="text-vault-muted font-normal text-sm ml-1">({{ hand.length }} cards)</span>
          </h2>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded-lg text-xs font-bold text-vault-muted hover:bg-vault-surface2 border border-vault-border transition-colors"
              @click="showHand = false">Close</button>
            <button v-if="hand.length > 0"
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              @click="playHand">
              Play All → Board
            </button>
          </div>
        </div>

        <div v-if="!hand.length" class="text-center py-6 text-vault-dim text-sm">Hand is empty</div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          <div v-for="card in hand" :key="card.uid"
            class="rounded-xl overflow-hidden flex flex-col ring-1 ring-violet-300">

            <!-- Face-down (drawn from library) -->
            <template v-if="card.hidden">
              <div class="relative aspect-[63/88] flex items-center justify-center cursor-pointer"
                style="background:linear-gradient(135deg,#4c1d95,#7c3aed)"
                @click="revealHandCard(card.uid)">
                <span class="text-white/30 text-4xl select-none">?</span>
                <div class="absolute bottom-1 inset-x-0 text-center">
                  <span class="text-[9px] text-white/50">tap to reveal</span>
                </div>
              </div>
              <div class="px-1.5 py-1 bg-vault-surface1 text-[10px] text-vault-dim leading-tight text-center">
                (hidden)
              </div>
            </template>

            <!-- Face-up (moved from board/grave, or revealed) -->
            <template v-else>
              <div class="relative aspect-[63/88] bg-vault-surface2 overflow-hidden">
                <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name"
                  class="w-full h-full object-cover" loading="lazy" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center p-1 text-center">
                  <v-icon name="fa-skull" scale="1.2" class="text-vault-dim mb-1" />
                  <span class="text-[10px] text-vault-muted leading-tight">{{ card.name }}</span>
                </div>
              </div>
              <div class="px-1.5 py-1 bg-vault-surface1 text-[10px] font-medium text-vault-text leading-tight truncate">
                {{ card.name }}
              </div>
            </template>

            <div class="p-0.5 bg-vault-surface2">
              <button
                class="w-full py-1 rounded text-[10px] font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                @click="playCardFromHand(card.uid)">
                → Board
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ Battlefield ═══════════════════════════════════════════════════ -->
      <div class="vault-card p-4 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display text-lg font-bold text-vault-text">
            Battlefield
            <span class="text-vault-muted font-normal text-sm ml-1">({{ battlefield.length }})</span>
          </h2>
          <div class="flex gap-2">
            <button v-if="battlefield.length > 0"
              class="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
              @click="killAll">
              ☠ Kill All
            </button>
            <button v-if="isHordeTurn && revealedThisTurn.size > 0"
              class="px-3 py-1.5 rounded-lg text-xs font-bold text-vault-muted hover:bg-vault-surface2 transition-colors"
              @click="surviveAll">
              ✓ Survive All
            </button>
          </div>
        </div>

        <div v-if="!battlefield.length" class="text-center py-8 text-vault-dim text-sm">
          No creatures on the battlefield
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          <div v-for="card in battlefield" :key="card.uid"
            class="relative rounded-xl overflow-hidden flex flex-col"
            :class="revealedThisTurn.has(card.uid) ? 'ring-2 ring-red-400' : 'ring-1 ring-vault-border'">

            <div class="relative aspect-[63/88] bg-vault-surface2 overflow-hidden">
              <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name"
                class="w-full h-full object-cover" loading="lazy" />
              <div v-else class="w-full h-full flex flex-col items-center justify-center p-1 text-center">
                <v-icon name="fa-skull" scale="1.2" class="text-vault-dim mb-1" />
                <span class="text-[10px] text-vault-muted leading-tight">{{ card.name }}</span>
              </div>
              <div v-if="revealedThisTurn.has(card.uid)"
                class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500 text-white uppercase tracking-wide">
                NEW
              </div>
            </div>

            <div class="px-1.5 py-1 bg-vault-surface1 text-[10px] font-medium text-vault-text leading-tight truncate">
              {{ card.name }}
            </div>

            <!-- 3-button row: Kill | Hand | Dmg -->
            <div class="grid grid-cols-3 gap-0.5 p-0.5 bg-vault-surface2">
              <button
                class="py-1 rounded text-[10px] font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-colors active:scale-95"
                @click="killCard(card.uid)">
                ☠
              </button>
              <button
                class="py-1 rounded text-[10px] font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors active:scale-95"
                @click="moveToHand(card.uid, 'battlefield')">
                🤫
              </button>
              <button v-if="revealedThisTurn.has(card.uid)"
                class="py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors active:scale-95"
                @click="surviveCard(card.uid)">
                Dmg
              </button>
              <div v-else class="py-1 rounded text-[10px] text-center text-vault-dim bg-vault-surface3">—</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ Graveyard ════════════════════════════════════════════════════ -->
      <div class="vault-card p-4 space-y-3">
        <button class="w-full flex items-center justify-between" @click="showGraveyard = !showGraveyard">
          <h2 class="font-display text-lg font-bold text-vault-text">
            Graveyard
            <span class="text-vault-muted font-normal text-sm ml-1">({{ graveyard.length }})</span>
          </h2>
          <v-icon :name="showGraveyard ? 'fa-chevron-right' : 'fa-chevron-right'"
            class="text-vault-muted transition-transform"
            :style="showGraveyard ? 'transform:rotate(90deg)' : ''"
            scale="0.8" />
        </button>

        <template v-if="showGraveyard">
          <div v-if="!graveyard.length" class="text-center py-6 text-vault-dim text-sm">
            Graveyard is empty
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            <div v-for="(card, i) in [...graveyard].reverse()" :key="card.uid"
              class="rounded-xl overflow-hidden flex flex-col ring-1 ring-vault-border opacity-80 hover:opacity-100 transition-opacity">

              <div class="relative aspect-[63/88] bg-vault-surface2 overflow-hidden">
                <img v-if="card.imageUrl" :src="card.imageUrl" :alt="card.name"
                  class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" loading="lazy" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center p-1 text-center">
                  <v-icon name="fa-skull" scale="1.2" class="text-vault-dim mb-1" />
                  <span class="text-[10px] text-vault-muted leading-tight">{{ card.name }}</span>
                </div>
                <!-- Position from top badge -->
                <div class="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/50 text-white">
                  #{{ graveyard.length - i }}
                </div>
              </div>

              <div class="px-1.5 py-1 bg-vault-surface1 text-[10px] font-medium text-vault-text leading-tight truncate">
                {{ card.name }}
              </div>

              <!-- 2-button row: → Board | → Hand -->
              <div class="grid grid-cols-2 gap-0.5 p-0.5 bg-vault-surface2">
                <button
                  class="py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors active:scale-95"
                  @click="returnToBoard(card.uid)">
                  → Board
                </button>
                <button
                  class="py-1 rounded text-[10px] font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors active:scale-95"
                  @click="moveToHand(card.uid, 'graveyard')">
                  🤫 Hand
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db } from '~/db'
import type { Deck, ScryfallCard } from '~/types'

// ── Setup ─────────────────────────────────────────────────────────────────────
const gamePhase = ref<'setup' | 'game'>('setup')
const hordeDecks = ref<Deck[]>([])
const loadingDecks = ref(true)
const loadingGame = ref(false)
const selectedDeckId = ref<string | null>(null)
const setupSurvivorCount = ref(2)
const setupStartingLife = ref(60)
const setupDrawSteps = ref(1)
const setupFreeTurns = ref(3)
const setupDeckSize = ref(100)
const setupTokenMultiplier = ref(1)
const setupSafeZone = ref(false)
const setupSafeZoneSize = ref<'default' | 'reduced'>('default')
const setupAltDrawMode = ref(false)
const setupAltDrawCount = ref(3)
const setupHordeLifepoints = ref(false)
const setupHordeHP = ref(50)

function deckCardCount(deck: Deck): number {
  return deck.cards.reduce((s, c) => s + c.quantity, 0)
}

onMounted(async () => {
  const all = await db.decks.toArray()
  hordeDecks.value = all.filter(d => d.format === 'horde')
  loadingDecks.value = false
})

// ── Card instance ─────────────────────────────────────────────────────────────
interface CardInstance {
  uid: string
  scryfallId: string
  name: string
  typeLine: string
  imageUrl: string | null
  isToken: boolean
  hidden?: boolean   // true = drawn face-down from library, show as "?" until revealed
}

function cardImageUrl(sc: ScryfallCard): string | null {
  return sc.image_uris?.normal ?? sc.card_faces?.[0]?.image_uris?.normal ?? null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Game state ─────────────────────────────────────────────────────────────────
const library    = ref<CardInstance[]>([])
const hand       = ref<CardInstance[]>([])
const battlefield = ref<CardInstance[]>([])
const graveyard  = ref<CardInstance[]>([])

const revealedThisTurn = ref<Set<string>>(new Set())
const drawsDoneThisTurn = ref(0)
const isHordeTurn = ref(false)
const round = ref(1)
const freeTurnsLeft = ref(0)
const deckSize = ref(0)
const damageAmount = ref(1)
// Active game options (locked in at startGame)
const hordeLifepoints = ref(false)
const hordeHP = ref(0)
const hordeMaxHP = ref(0)
const altDrawMode = ref(false)
const altDrawCount = ref(3)

// UI toggles
const showHand = ref(false)
const showGraveyard = ref(false)

interface Survivor { name: string; life: number; color: string }
const SURVIVOR_COLORS = ['#7c3aed', '#2563eb', '#dc2626', '#16a34a', '#d97706']
const survivors = ref<Survivor[]>([])

const totalSurvivorLife = computed(() => survivors.value.reduce((s, p) => s + p.life, 0))
const canDraw = computed(() =>
  isHordeTurn.value &&
  drawsDoneThisTurn.value < setupDrawSteps.value &&
  library.value.length > 0
)

// ── Start game ────────────────────────────────────────────────────────────────
async function startGame() {
  if (!selectedDeckId.value) return
  loadingGame.value = true

  const deck = await db.decks.get(selectedDeckId.value)
  if (!deck) { loadingGame.value = false; return }

  const instances: CardInstance[] = []
  for (const dc of deck.cards) {
    const sc = await db.scryfallCards.get(dc.scryfallId)
    if (!sc) continue
    const imageUrl = cardImageUrl(sc)
    const isToken = sc.type_line?.toLowerCase().includes('token') ?? false
    // Apply token multiplier
    const qty = isToken ? dc.quantity * setupTokenMultiplier.value : dc.quantity
    // Apply deck size percentage
    const scaledQty = Math.max(1, Math.round(qty * setupDeckSize.value / 100))
    for (let i = 0; i < scaledQty; i++) {
      instances.push({ uid: crypto.randomUUID(), scryfallId: dc.scryfallId, name: sc.name, typeLine: sc.type_line ?? '', imageUrl, isToken })
    }
  }

  let shuffled = shuffle(instances)

  // Apply safe zone: ensure first N positions are tokens only
  if (setupSafeZone.value) {
    const safeCount = setupSafeZoneSize.value === 'reduced' ? 10 : 20
    const tokens = shuffled.filter(c => c.isToken)
    const nonTokens = shuffled.filter(c => !c.isToken)
    const safeTokens = tokens.splice(0, Math.min(safeCount, tokens.length))
    const rest = shuffle([...tokens, ...nonTokens])
    shuffled = [...safeTokens, ...rest]
  }

  library.value = shuffled
  deckSize.value = shuffled.length

  // Lock in advanced options for this game
  altDrawMode.value = setupAltDrawMode.value
  altDrawCount.value = setupAltDrawCount.value
  hordeLifepoints.value = setupHordeLifepoints.value
  hordeMaxHP.value = setupHordeLifepoints.value ? setupHordeHP.value : 0
  hordeHP.value = hordeMaxHP.value
  hand.value = []
  battlefield.value = []
  graveyard.value = []
  revealedThisTurn.value = new Set()
  drawsDoneThisTurn.value = 0
  round.value = 1
  freeTurnsLeft.value = setupFreeTurns.value
  damageAmount.value = 1
  isHordeTurn.value = false
  showHand.value = false
  showGraveyard.value = false

  survivors.value = Array.from({ length: setupSurvivorCount.value }, (_, i) => ({
    name: `Player ${i + 1}`, life: setupStartingLife.value, color: SURVIVOR_COLORS[i],
  }))

  loadingGame.value = false
  gamePhase.value = 'game'
}

// ── Draw step (library → battlefield) ────────────────────────────────────────
function drawStep() {
  if (!canDraw.value) return
  const revealed: string[] = []
  if (altDrawMode.value) {
    const count = Math.min(altDrawCount.value, library.value.length)
    for (let i = 0; i < count; i++) {
      const card = library.value.shift()!
      battlefield.value.push(card)
      revealed.push(card.uid)
    }
  } else {
    while (library.value.length > 0) {
      const card = library.value.shift()!
      battlefield.value.push(card)
      revealed.push(card.uid)
      if (!card.isToken) break
    }
  }
  revealedThisTurn.value = new Set([...revealedThisTurn.value, ...revealed])
  drawsDoneThisTurn.value++
}

// ── Draw to hand (library → hand, face-down) ──────────────────────────────────
function drawToHand() {
  if (!library.value.length) return
  const card = { ...library.value.shift()!, hidden: true }
  hand.value.push(card)
  showHand.value = false
}

// ── Play hand (hand → battlefield) ────────────────────────────────────────────
function playHand() {
  const uids: string[] = []
  for (const card of hand.value) {
    battlefield.value.push(card)
    uids.push(card.uid)
  }
  hand.value = []
  revealedThisTurn.value = new Set([...revealedThisTurn.value, ...uids])
}

function revealHandCard(uid: string) {
  const card = hand.value.find(c => c.uid === uid)
  if (card) card.hidden = false
}

function playCardFromHand(uid: string) {
  const idx = hand.value.findIndex(c => c.uid === uid)
  if (idx === -1) return
  const [card] = hand.value.splice(idx, 1)
  battlefield.value.push(card)
  revealedThisTurn.value = new Set([...revealedThisTurn.value, card.uid])
}

// ── Battlefield actions ───────────────────────────────────────────────────────
function killCard(uid: string) {
  const idx = battlefield.value.findIndex(c => c.uid === uid)
  if (idx === -1) return
  const [card] = battlefield.value.splice(idx, 1)
  graveyard.value.push(card)
  revealedThisTurn.value.delete(uid)
}

function surviveCard(uid: string) {
  revealedThisTurn.value.delete(uid)
}

function killAll() {
  graveyard.value.push(...battlefield.value)
  battlefield.value = []
  revealedThisTurn.value = new Set()
}

function surviveAll() {
  revealedThisTurn.value = new Set()
}

// ── Move to hand from any zone ────────────────────────────────────────────────
function moveToHand(uid: string, from: 'battlefield' | 'graveyard') {
  const source = from === 'battlefield' ? battlefield : graveyard
  const idx = source.value.findIndex(c => c.uid === uid)
  if (idx === -1) return
  const [card] = source.value.splice(idx, 1)
  hand.value.push(card)
  revealedThisTurn.value.delete(uid)
  showHand.value = false  // collapse so the card isn't immediately visible
}

// ── Graveyard actions ─────────────────────────────────────────────────────────
function returnToBoard(uid: string) {
  const idx = graveyard.value.findIndex(c => c.uid === uid)
  if (idx === -1) return
  const [card] = graveyard.value.splice(idx, 1)
  battlefield.value.push(card)
  revealedThisTurn.value = new Set([...revealedThisTurn.value, card.uid])
}

// ── Turn flow ─────────────────────────────────────────────────────────────────
function endHordeTurn() {
  revealedThisTurn.value = new Set()
  drawsDoneThisTurn.value = 0
  isHordeTurn.value = false
}

function endSurvivorTurn() {
  if (freeTurnsLeft.value > 0) {
    freeTurnsLeft.value--
    if (freeTurnsLeft.value > 0) return
  }
  round.value++
  drawsDoneThisTurn.value = 0
  // Auto-play hand cards at the start of the horde's turn
  if (hand.value.length > 0) playHand()
  isHordeTurn.value = true
}

// ── Damage / mill ─────────────────────────────────────────────────────────────
function dealDamage() {
  let remaining = damageAmount.value
  // Horde lifepoints: damage depletes HP before milling
  if (hordeLifepoints.value && hordeHP.value > 0) {
    const hpDmg = Math.min(remaining, hordeHP.value)
    hordeHP.value -= hpDmg
    remaining -= hpDmg
    if (remaining <= 0) return
  }
  const mill = Math.min(remaining, library.value.length)
  graveyard.value.push(...library.value.splice(0, mill))
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function confirmReset() {
  if (!confirm('Return to setup? This ends the current game.')) return
  library.value = []
  hand.value = []
  battlefield.value = []
  graveyard.value = []
  revealedThisTurn.value = new Set()
  hordeHP.value = 0
  hordeMaxHP.value = 0
  gamePhase.value = 'setup'
}
</script>
