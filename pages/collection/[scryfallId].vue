<template>
  <div class="p-6 space-y-6">
    <!-- Back -->
    <button class="flex items-center gap-2 text-vault-muted hover:text-vault-text text-sm transition-colors" @click="$router.back()">
      <v-icon name="fa-chevron-left" scale="0.8" />
      Back to Collection
    </button>

    <div v-if="baseCard" class="flex gap-5 items-start flex-wrap">
      <!-- Representative image -->
      <img
        v-if="baseImage"
        :src="baseImage"
        :alt="baseCard.name"
        class="w-36 rounded-xl shadow-2xl shrink-0"
        style="aspect-ratio:63/88; object-fit:cover;"
      />
      <div>
        <h1 class="font-display text-3xl text-vault-gold">{{ baseCard.name }}</h1>
        <p class="text-vault-muted text-sm mt-1">{{ baseCard.type_line }}</p>
        <ManaCost :cost="baseCard.mana_cost ?? ''" class="mt-2" />
        <p class="text-xs text-vault-dim mt-2">{{ allPrintings.length }} printing{{ allPrintings.length !== 1 ? 's' : '' }} in database · {{ ownedEntries.length }} in your collection</p>
      </div>
    </div>

    <!-- All printings grid -->
    <div v-if="allPrintings.length" class="space-y-3">
      <h2 class="text-sm font-semibold text-vault-text uppercase tracking-widest">All Printings</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="printing in allPrintings"
          :key="printing.id"
          class="vault-card p-4 flex gap-3 items-start"
          :class="ownedMap.has(printing.id) ? 'ring-1 ring-vault-accent/30' : ''"
        >
          <img
            v-if="printing.image_uris?.small ?? printing.card_faces?.[0]?.image_uris?.small"
            :src="printing.image_uris?.small ?? printing.card_faces?.[0]?.image_uris?.small"
            :alt="printing.name"
            class="w-12 rounded shrink-0"
            style="aspect-ratio:63/88; object-fit:cover;"
          />
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-vault-text">{{ printing.set_name }}</p>
                <p class="text-xs text-vault-dim">#{{ printing.collector_number }} · {{ printing.released_at?.slice(0, 4) }} · <span class="capitalize">{{ printing.rarity }}</span></p>
              </div>
              <div class="text-right shrink-0">
                <p v-if="printing.prices?.usd" class="text-xs text-vault-gold">${{ printing.prices.usd }}</p>
                <p v-if="printing.prices?.usd_foil" class="text-[10px] text-vault-dim">${{ printing.prices.usd_foil }} foil</p>
              </div>
            </div>

            <!-- Owned copies -->
            <div v-if="ownedMap.has(printing.id)" class="pt-1 border-t border-vault-border/50 space-y-1">
              <div
                v-for="entry in ownedMap.get(printing.id)"
                :key="entry.id"
                class="flex items-center justify-between text-[11px]"
              >
                <span class="text-vault-muted">
                  {{ entry.quantity }}× normal
                  <span v-if="(entry.foilQuantity ?? 0) > 0" class="text-vault-gold ml-1">· {{ entry.foilQuantity }}× foil</span>
                  · {{ entry.condition }}
                  <span v-if="entry.isProxy" class="text-amber-400 ml-1">PROXY</span>
                </span>
                <button
                  class="text-vault-accent hover:text-vault-accent/70 transition-colors"
                  @click="editEntry(entry, printing)"
                >Edit</button>
              </div>
            </div>
            <div v-else class="pt-1">
              <button
                class="text-[11px] text-vault-accent/70 hover:text-vault-accent transition-colors"
                @click="addPrinting(printing)"
              >+ Add to collection</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="text-center py-20">
      <v-icon name="fa-spinner" class="animate-spin text-vault-accent" scale="2" />
    </div>

    <!-- Edit dialog -->
    <Dialog v-model:visible="showEdit" modal header="Edit Card" class="w-full max-w-lg">
      <EditCardForm
        v-if="editItem"
        :entry="editItem.entry"
        :card="editItem.card"
        @saved="onSaved"
        @deleted="onSaved"
        @close="showEdit = false"
      />
    </Dialog>

    <!-- Add dialog -->
    <Dialog v-model:visible="showAdd" modal header="Add to Collection" class="w-full max-w-lg">
      <AddCardForm
        v-if="addCard"
        :initial-card="addCard"
        @saved="onSaved"
        @close="showAdd = false"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/db'
import type { CollectionEntry, ScryfallCard } from '~/types'

const route = useRoute()
const scryfallId = route.params.scryfallId as string

const loading = ref(true)
const baseCard = ref<ScryfallCard | null>(null)
const allPrintings = ref<ScryfallCard[]>([])
const ownedEntries = ref<CollectionEntry[]>([])
const ownedMap = ref(new Map<string, CollectionEntry[]>())
const showEdit = ref(false)
const showAdd = ref(false)
const editItem = ref<{ entry: CollectionEntry; card: ScryfallCard } | null>(null)
const addCard = ref<ScryfallCard | null>(null)

const baseImage = computed(() =>
  baseCard.value?.image_uris?.normal ?? baseCard.value?.card_faces?.[0]?.image_uris?.normal
)

async function load() {
  loading.value = true
  const card = await db.scryfallCards.get(scryfallId)
  if (!card) { loading.value = false; return }
  baseCard.value = card

  // Fetch all printings via oracle_id
  const printings = card.oracle_id
    ? await db.scryfallCards.where('oracle_id').equals(card.oracle_id).toArray()
    : [card]

  printings.sort((a, b) => b.released_at.localeCompare(a.released_at))
  allPrintings.value = printings

  // Owned entries
  const printingIds = new Set(printings.map(p => p.id))
  const entries = await db.collection.filter(e => printingIds.has(e.scryfallId)).toArray()
  ownedEntries.value = entries

  const map = new Map<string, CollectionEntry[]>()
  for (const entry of entries) {
    if (!map.has(entry.scryfallId)) map.set(entry.scryfallId, [])
    map.get(entry.scryfallId)!.push(entry)
  }
  ownedMap.value = map
  loading.value = false
}

function editEntry(entry: CollectionEntry, card: ScryfallCard) {
  editItem.value = { entry, card }
  showEdit.value = true
}

function addPrinting(card: ScryfallCard) {
  addCard.value = card
  showAdd.value = true
}

async function onSaved() {
  showEdit.value = false
  showAdd.value = false
  editItem.value = null
  addCard.value = null
  await load()
}

onMounted(load)
</script>
