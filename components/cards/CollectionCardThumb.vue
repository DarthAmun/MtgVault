<template>
  <div
    class="relative cursor-pointer"
    :style="stackCount > 1 ? 'padding-bottom: 8px; padding-right: 6px;' : ''"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @click="$emit('click')"
  >
    <!-- Stack backing cards (rendered behind, slightly offset + rotated) -->
    <template v-if="stackCount > 1">
      <!-- Third card (bottom of stack) -->
      <div
        v-if="stackCount > 2"
        class="absolute inset-0 rounded-lg overflow-hidden border border-vault-border/60"
        style="
          aspect-ratio: 63/88;
          background: #e2ddf7;
          transform: rotate(5deg) translate(5px, 6px);
          transform-origin: bottom center;
        "
      />
      <!-- Second card -->
      <div
        class="absolute inset-0 rounded-lg overflow-hidden border border-vault-border/80"
        style="
          aspect-ratio: 63/88;
          background: #ede9fe;
          transform: rotate(2.5deg) translate(3px, 3px);
          transform-origin: bottom center;
        "
      />
    </template>

    <!-- Main card -->
    <div
      class="relative rounded-lg overflow-hidden bg-vault-surface2"
      style="aspect-ratio: 63/88; transition: transform 0.2s ease, box-shadow 0.2s ease;"
      :style="hovered
        ? 'transform: scale(1.05) translateY(-2px); box-shadow: 0 14px 36px rgba(124,58,237,0.25);'
        : stackCount > 1 ? 'box-shadow: 0 4px 12px rgba(0,0,0,0.10);' : ''"
    >
      <img
        v-if="imageUri"
        :src="imageUri"
        :alt="card?.name"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-vault-dim">
        <v-icon name="fa-image" scale="1.5" />
      </div>

      <!-- Foil shimmer overlay -->
      <div v-if="isFoil" class="foil-shimmer" />

      <!-- Quantity badge -->
      <div
        v-if="totalQty > 1"
        class="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1 bg-white/90 rounded-full flex items-center justify-center text-xs font-bold text-vault-text border border-white/60 shadow-sm"
      >
        {{ totalQty }}
      </div>

      <!-- Foil badge -->
      <div
        v-if="isFoil"
        class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style="background: linear-gradient(135deg,#c9a84c,#e8c96a,#c9a84c); color: #1a1625"
      >
        FOIL
      </div>

      <!-- Custom badge -->
      <div
        v-if="entry.isCustom"
        class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style="background: rgba(124,58,237,0.85); color: #fff;"
      >
        CUSTOM
      </div>

      <!-- Proxy badge -->
      <div
        v-else-if="entry.isProxy"
        class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/50 text-white/80"
      >
        PROXY
      </div>

      <!-- Versions badge -->
      <div
        v-if="stackCount > 1"
        class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-vault-accent text-white shadow"
      >
        {{ stackCount }}×
      </div>

      <!-- Hover overlay -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-end pb-2 gap-1 transition-opacity duration-200"
        :class="hovered ? 'opacity-100' : 'opacity-0'"
        style="background: linear-gradient(to top, rgba(30,26,46,0.72) 0%, transparent 55%);"
      >
        <div class="flex gap-1">
          <button
            class="text-[11px] bg-white/90 px-2 py-0.5 rounded text-vault-text shadow-sm font-medium hover:bg-white"
            @click.stop="$emit('edit')"
          >
            Edit
          </button>
          <button
            v-if="stackCount > 1"
            class="text-[11px] bg-vault-accent/90 px-2 py-0.5 rounded text-white shadow-sm font-medium hover:bg-vault-accent"
            @click.stop="$emit('versions')"
          >
            Versions
          </button>
        </div>
      </div>
    </div>

    <!-- Card name -->
    <p class="mt-1 text-xs text-vault-muted truncate px-0.5">{{ card?.name ?? '—' }}</p>
    <p class="text-[10px] text-vault-dim truncate px-0.5">{{ card?.set_name }}</p>

    <!-- Deck locations -->
    <div
      v-if="deckNames.length"
      class="flex items-center gap-1 mt-0.5 px-0.5 min-w-0 overflow-hidden"
      :title="deckNames.join('\n')"
    >
      <v-icon name="fa-layer-group" scale="0.65" class="text-vault-accent/60 shrink-0" />
      <span class="text-[10px] text-vault-accent/70 truncate">
        {{ deckNames.length === 1 ? deckNames[0] : `${deckNames.length} decks` }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import type { CollectionEntry, ScryfallCard } from '~/types'

const props = defineProps<{
  entry: CollectionEntry
  card?: ScryfallCard
  stackCount?: number
}>()

defineEmits<{ click: []; edit: []; versions: [] }>()

const hovered = ref(false)
const deckNames = ref<string[]>([])

const imageUri = computed(() =>
  props.card?.image_uris?.normal ??
  props.card?.card_faces?.[0]?.image_uris?.normal
)

const totalQty = computed(() => props.entry.quantity + (props.entry.foilQuantity ?? 0))
const isFoil = computed(() => (props.entry.foilQuantity ?? 0) > 0)
const stackCount = computed(() => props.stackCount ?? 1)

onMounted(async () => {
  // Collect all scryfallIds for this card (all printings via oracle_id)
  const sc = await db.scryfallCards.get(props.entry.scryfallId)
  const printingIds = new Set<string>()
  if (sc?.oracle_id) {
    const printings = await db.scryfallCards.where('oracle_id').equals(sc.oracle_id).toArray()
    printings.forEach(p => printingIds.add(p.id))
  } else {
    printingIds.add(props.entry.scryfallId)
  }

  const allDecks = await db.decks.toArray()
  deckNames.value = allDecks
    .filter(d => d.cards.some(c => printingIds.has(c.scryfallId)))
    .map(d => d.name)
})
</script>
