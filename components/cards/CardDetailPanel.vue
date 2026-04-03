<template>
  <div v-if="card" class="space-y-5 p-2">
    <!-- Card image -->
    <img
      :src="card.image_uris?.large ?? card.card_faces?.[0]?.image_uris?.large"
      :alt="card.name"
      class="w-full rounded-xl shadow-2xl mtg-card-img"
    />

    <!-- Name & set -->
    <div>
      <h2 class="font-display text-xl text-vault-gold">{{ card.name }}</h2>
      <p class="text-vault-muted text-sm">{{ card.set_name }} · #{{ card.collector_number }}</p>
    </div>

    <!-- Type & mana -->
    <div class="flex items-center justify-between">
      <span class="text-sm text-vault-text">{{ card.type_line }}</span>
      <ManaCost :cost="card.mana_cost ?? ''" />
    </div>

    <!-- Oracle text -->
    <div v-if="card.oracle_text" class="p-3 bg-vault-surface2 rounded-lg">
      <p class="text-sm text-vault-text whitespace-pre-line leading-relaxed">{{ card.oracle_text }}</p>
      <p v-if="card.flavor_text" class="text-xs text-vault-muted italic mt-2 border-t border-vault-border pt-2">
        {{ card.flavor_text }}
      </p>
    </div>

    <!-- P/T or Loyalty -->
    <div v-if="card.power || card.loyalty" class="text-right">
      <span v-if="card.power" class="font-bold text-lg">{{ card.power }}/{{ card.toughness }}</span>
      <span v-if="card.loyalty" class="font-bold text-lg">⟳{{ card.loyalty }}</span>
    </div>

    <!-- Collection entry details -->
    <div class="vault-card p-4 space-y-3">
      <h3 class="text-sm font-semibold text-vault-text">Your Copy</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <InfoRow label="Normal" :value="`${entry.quantity}×`" />
        <InfoRow label="Foil" :value="`${entry.foilQuantity ?? 0}×`" />
        <InfoRow label="Condition" :value="entry.condition" />
        <InfoRow label="Language" :value="entry.language.toUpperCase()" />
        <InfoRow v-if="entry.storage" label="Storage" :value="entry.storage" />
        <InfoRow label="Added" :value="new Date(entry.addedAt).toLocaleDateString()" />
      </div>
      <div v-if="entry.deckIds.length" class="pt-2 border-t border-vault-border">
        <p class="text-xs text-vault-muted mb-1">Used in {{ entry.deckIds.length }} deck(s)</p>
      </div>
    </div>

    <!-- Prices -->
    <div class="vault-card p-4 space-y-2">
      <h3 class="text-sm font-semibold text-vault-text">Prices</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <InfoRow label="USD" :value="card.prices?.usd ? `$${card.prices.usd}` : '—'" />
        <InfoRow label="USD Foil" :value="card.prices?.usd_foil ? `$${card.prices.usd_foil}` : '—'" />
        <InfoRow label="EUR" :value="card.prices?.eur ? `€${card.prices.eur}` : '—'" />
        <InfoRow label="MTGO (tix)" :value="card.prices?.tix ?? '—'" />
      </div>
    </div>

    <!-- Legalities -->
    <div class="vault-card p-4">
      <h3 class="text-sm font-semibold text-vault-text mb-3">Legalities</h3>
      <div class="grid grid-cols-2 gap-1">
        <div
          v-for="(status, format) in topFormats"
          :key="format"
          class="flex items-center gap-2 text-xs"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="status === 'legal' ? 'bg-emerald-500' : status === 'banned' ? 'bg-red-500' : 'bg-vault-dim'"
          />
          <span class="text-vault-muted capitalize">{{ format }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CollectionEntry, ScryfallCard, MtgFormat } from '~/types'

const props = defineProps<{
  entry: CollectionEntry
  card?: ScryfallCard
}>()

const PRIORITY_FORMATS: MtgFormat[] = [
  'standard', 'pioneer', 'modern', 'legacy', 'vintage',
  'commander', 'pauper', 'historic', 'explorer',
]

const topFormats = computed(() => {
  if (!props.card?.legalities) return {}
  return Object.fromEntries(
    PRIORITY_FORMATS.map(f => [f, props.card!.legalities[f]])
  )
})
</script>
