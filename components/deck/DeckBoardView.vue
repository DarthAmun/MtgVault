<template>
  <div class="deck-columns">
    <!-- All groups including commander flow through CSS columns -->
    <div
      v-for="group in allGroups"
      :key="group.key"
      class="deck-group"
    >
      <div class="flex items-center gap-2 mb-1.5">
        <span
          class="text-[11px] font-bold uppercase tracking-widest"
          :style="{ color: group.color }"
        >{{ group.label }}</span>
        <div class="flex-1 h-px opacity-25" :style="{ background: group.color }" />
        <span class="text-[11px] text-vault-muted tabular-nums">{{ groupQty(group.items) }}</span>
      </div>
      <DeckBoardRow
        v-for="item in group.items"
        :key="item.dc.scryfallId + item.dc.isSideboard"
        :item="item"
        :deck-id="deckId"
        @changed="$emit('changed')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScryfallCard } from '~/types'

interface EnrichedCard {
  dc: { scryfallId: string; quantity: number; isSideboard: boolean; isCommander: boolean; isCompanion: boolean; collectionEntryId?: string; foil?: boolean; notOwned?: boolean }
  card?: ScryfallCard
}

const props = defineProps<{
  cards: EnrichedCard[]
  deckId: string
}>()

defineEmits<{ changed: [] }>()

function typeBucket(sc?: ScryfallCard): string {
  if (!sc) return 'other'
  const t = sc.type_line ?? ''
  if (t.includes('Creature')) return 'creature'
  if (t.includes('Planeswalker')) return 'planeswalker'
  if (t.includes('Instant')) return 'instant'
  if (t.includes('Sorcery')) return 'sorcery'
  if (t.includes('Artifact')) return 'artifact'
  if (t.includes('Enchantment')) return 'enchantment'
  if (t.includes('Land')) return 'land'
  return 'other'
}

const TYPE_META: { key: string; label: string; color: string }[] = [
  { key: 'commander',   label: 'Commander',    color: '#c9a84c' },
  { key: 'creature',    label: 'Creatures',    color: '#4ade80' },
  { key: 'planeswalker',label: 'Planeswalkers',color: '#f59e0b' },
  { key: 'instant',     label: 'Instants',     color: '#60a5fa' },
  { key: 'sorcery',     label: 'Sorceries',    color: '#c084fc' },
  { key: 'artifact',    label: 'Artifacts',    color: '#94a3b8' },
  { key: 'enchantment', label: 'Enchantments', color: '#f472b6' },
  { key: 'land',        label: 'Lands',        color: '#86efac' },
  { key: 'other',       label: 'Other',        color: '#64748b' },
]

const allGroups = computed(() => {
  const buckets: Record<string, EnrichedCard[]> = {}
  for (const m of TYPE_META) buckets[m.key] = []

  for (const item of props.cards) {
    if (item.dc.isSideboard) continue
    const key = item.dc.isCommander ? 'commander' : typeBucket(item.card)
    buckets[key].push(item)
  }

  // Sort each bucket by CMC then name
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => {
      const d = (a.card?.cmc ?? 0) - (b.card?.cmc ?? 0)
      return d !== 0 ? d : (a.card?.name ?? '').localeCompare(b.card?.name ?? '')
    })
  }

  return TYPE_META
    .map(m => ({ ...m, items: buckets[m.key] }))
    .filter(g => g.items.length > 0)
})

function groupQty(items: EnrichedCard[]): number {
  return items.reduce((s, i) => s + i.dc.quantity, 0)
}
</script>

<style scoped>
.deck-columns {
  columns: 1;
  column-gap: 1.5rem;
}

@media (min-width: 640px) {
  .deck-columns { columns: 2; }
}

@media (min-width: 1280px) {
  .deck-columns { columns: 3; }
}

.deck-group {
  break-inside: avoid;
  margin-bottom: 1.25rem;
}
</style>
