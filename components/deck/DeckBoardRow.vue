<template>
  <div
    class="relative flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-vault-surface2 group transition-colors cursor-default"
    @mouseenter="showPreview = true"
    @mouseleave="showPreview = false"
  >
    <!-- Qty controls -->
    <div class="flex items-center gap-1 shrink-0" @click.stop>
      <button
        class="w-4 h-4 rounded flex items-center justify-center text-vault-dim hover:text-vault-accent opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
        @click="adjust(-1)"
      >−</button>
      <span class="text-xs font-mono font-bold text-vault-accent w-4 text-center">{{ item.dc.quantity }}</span>
      <button
        class="w-4 h-4 rounded flex items-center justify-center text-vault-dim hover:text-vault-accent opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
        @click="adjust(1)"
      >+</button>
    </div>

    <!-- Name -->
    <span
      class="flex-1 text-sm truncate min-w-0"
      :class="item.dc.isCommander ? 'font-semibold text-vault-gold' : ownedCount >= item.dc.quantity ? 'text-vault-text' : 'text-amber-400'"
    >
      {{ item.card?.name ?? item.dc.scryfallId }}
      <span v-if="item.dc.foil" class="text-[9px] text-vault-gold ml-1 font-normal">FOIL</span>
    </span>

    <!-- NOT OWNED badge -->
    <span
      v-if="item.dc.notOwned"
      class="text-[9px] font-bold px-1 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 shrink-0 uppercase tracking-wide"
    >not owned</span>

    <!-- Mana cost -->
    <ManaCost v-if="item.card?.mana_cost" :cost="item.card.mana_cost" class="shrink-0" />

    <!-- Owned dot -->
    <span
      v-if="!item.dc.notOwned"
      class="w-1.5 h-1.5 rounded-full shrink-0"
      :class="ownedCount >= item.dc.quantity ? 'bg-emerald-400' : ownedCount > 0 ? 'bg-amber-400' : 'bg-red-400/50'"
      :title="ownedCount >= item.dc.quantity ? 'Owned' : `${ownedCount}/${item.dc.quantity} owned`"
    />

    <!-- Commander toggle — always visible when active, hover-visible otherwise -->
    <button
      class="transition-opacity shrink-0"
      :class="item.dc.isCommander
        ? 'opacity-100 text-vault-gold'
        : 'opacity-0 group-hover:opacity-100 text-vault-dim hover:text-vault-gold'"
      :title="item.dc.isCommander ? 'Remove Commander status' : 'Set as Commander'"
      @click.stop="toggleCommander"
    >
      <v-icon name="fa-crown" scale="0.75" />
    </button>

    <!-- Remove -->
    <button
      class="opacity-0 group-hover:opacity-100 transition-opacity text-vault-dim hover:text-red-400 shrink-0"
      @click.stop="remove"
    >
      <v-icon name="fa-times" scale="0.8" />
    </button>

    <!-- Card image tooltip -->
    <Teleport to="body">
      <div
        v-if="showPreview && imageUri"
        class="fixed z-50 pointer-events-none"
        :style="tooltipStyle"
      >
        <img :src="imageUri" :alt="item.card?.name" class="w-40 rounded-xl shadow-2xl" style="aspect-ratio:63/88; object-fit:cover;" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useDecks } from '~/composables/useDecks'
import { db } from '~/db'
import type { ScryfallCard } from '~/types'

interface EnrichedCard {
  dc: { scryfallId: string; quantity: number; isSideboard: boolean; isCommander: boolean; isCompanion: boolean; collectionEntryId?: string; foil?: boolean; notOwned?: boolean }
  card?: ScryfallCard
}

const props = defineProps<{ item: EnrichedCard; deckId: string }>()
const emit = defineEmits<{ changed: [] }>()

const { removeCardFromDeck, setCardQuantity, setCommander } = useDecks()

const showPreview = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)
const ownedCount = ref(0)

const imageUri = computed(() =>
  props.item.card?.image_uris?.normal ??
  props.item.card?.card_faces?.[0]?.image_uris?.normal
)

const tooltipStyle = computed(() => ({
  left: `${mouseX.value + 16}px`,
  top: `${Math.max(8, mouseY.value - 80)}px`,
}))

function onMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(async () => {
  window.addEventListener('mousemove', onMouseMove)
  const sc = props.item.card
  if (sc?.oracle_id) {
    const allPrintings = await db.scryfallCards.where('oracle_id').equals(sc.oracle_id).toArray()
    const ids = allPrintings.map(p => p.id)
    const entries = await db.collection.filter(e => ids.includes(e.scryfallId)).toArray()
    ownedCount.value = entries.reduce((s, e) => s + e.quantity + (e.foilQuantity ?? 0), 0)
  } else {
    const entries = await db.collection.where('scryfallId').equals(props.item.dc.scryfallId).toArray()
    ownedCount.value = entries.reduce((s, e) => s + e.quantity + (e.foilQuantity ?? 0), 0)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
})

async function adjust(delta: number) {
  const newQty = props.item.dc.quantity + delta
  if (newQty <= 0) {
    await removeCardFromDeck(props.deckId, props.item.dc.scryfallId, props.item.dc.isSideboard)
  } else {
    await setCardQuantity(props.deckId, props.item.dc.scryfallId, newQty, props.item.dc.isSideboard)
  }
  emit('changed')
}

async function remove() {
  await removeCardFromDeck(props.deckId, props.item.dc.scryfallId, props.item.dc.isSideboard)
  emit('changed')
}

async function toggleCommander() {
  await setCommander(props.deckId, props.item.dc.scryfallId, !props.item.dc.isCommander)
  emit('changed')
}
</script>
