<template>
  <div
    class="group relative cursor-pointer"
    @click="$emit('click')"
  >
    <!-- Card image -->
    <div class="relative aspect-[63/88] rounded-lg overflow-hidden bg-vault-surface2">
      <img
        v-if="imageUri"
        :src="imageUri"
        :alt="card?.name"
        class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-vault-dim">
        <v-icon name="fa-image" scale="1.5" />
      </div>

      <!-- Quantity badge -->
      <div
        v-if="(entry.quantity + (entry.foilQuantity ?? 0)) > 1"
        class="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1 bg-white/90 rounded-full flex items-center justify-center text-xs font-bold text-vault-text border border-white/60 shadow-sm"
      >
        {{ entry.quantity + (entry.foilQuantity ?? 0) }}
      </div>

      <!-- Foil shimmer badge -->
      <div
        v-if="(entry.foilQuantity ?? 0) > 0"
        class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style="background: linear-gradient(135deg,#c9a84c,#e8c96a,#c9a84c); color: #1a1625"
      >
        FOIL
      </div>

      <!-- Proxy badge -->
      <div
        v-if="entry.isProxy"
        class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/50 text-white/80"
      >
        PROXY
      </div>

      <!-- Hover overlay -->
      <div class="absolute inset-0 bg-vault-accent/0 group-hover:bg-vault-accent/10 transition-colors duration-200 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
        <button
          class="text-xs bg-white/90 px-2 py-1 rounded text-vault-text shadow-sm"
          @click.stop="$emit('edit')"
        >
          Edit
        </button>
      </div>
    </div>

    <!-- Card name -->
    <p class="mt-1 text-xs text-vault-muted truncate px-0.5">{{ card?.name ?? '—' }}</p>
    <p class="text-[10px] text-vault-dim truncate px-0.5">{{ card?.set_name }}</p>
  </div>
</template>

<script setup lang="ts">
import type { CollectionEntry, ScryfallCard } from '~/types'

const props = defineProps<{
  entry: CollectionEntry
  card?: ScryfallCard
}>()

defineEmits<{ click: []; edit: [] }>()

const imageUri = computed(() =>
  props.card?.image_uris?.normal ??
  props.card?.card_faces?.[0]?.image_uris?.normal
)
</script>
