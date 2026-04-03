<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="font-display text-3xl text-vault-gold">Collection</h1>
        <p class="text-vault-muted text-sm mt-1">{{ totalCount }} cards · {{ uniqueCount }} unique</p>
      </div>
      <div class="flex gap-2">
        <Button label="Import" outlined @click="showImport = true">
          <template #icon><v-icon name="fa-file-import" class="mr-2" /></template>
        </Button>
        <Button label="Add Card" @click="showAddCard = true">
          <template #icon><v-icon name="fa-plus" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <CollectionFilters v-model="filters" />

    <!-- Grid / List toggle -->
    <div class="flex items-center gap-2">
      <button
        class="p-2 rounded-lg transition-colors"
        :class="viewMode === 'grid' ? 'bg-vault-accent text-white' : 'text-vault-muted hover:text-vault-text'"
        @click="viewMode = 'grid'"
      >
        <v-icon name="fa-th-large" />
      </button>
      <button
        class="p-2 rounded-lg transition-colors"
        :class="viewMode === 'list' ? 'bg-vault-accent text-white' : 'text-vault-muted hover:text-vault-text'"
        @click="viewMode = 'list'"
      >
        <v-icon name="fa-list" />
      </button>
      <span class="text-vault-muted text-sm ml-auto">{{ filtered.length }} results</span>
    </div>

    <!-- Card grid -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <CollectionCardThumb
        v-for="item in paginated"
        :key="item.entry.id"
        :entry="item.entry"
        :card="item.card"
        @click="selectCard(item)"
        @edit="editEntry(item)"
      />
    </div>

    <!-- List view -->
    <div v-else class="space-y-1">
      <CollectionListRow
        v-for="item in paginated"
        :key="item.entry.id"
        :entry="item.entry"
        :card="item.card"
        @click="selectCard(item)"
        @edit="editEntry(item)"
      />
    </div>

    <!-- Pagination -->
    <div class="flex justify-center">
      <Paginator
        :rows="pageSize"
        :total-records="filtered.length"
        :first="(page - 1) * pageSize"
        @page="e => page = e.page + 1"
      />
    </div>

    <!-- Add Card Dialog -->
    <Dialog v-model:visible="showAddCard" modal header="Add Card" class="w-full max-w-lg">
      <AddCardForm @saved="onCardSaved" @close="showAddCard = false" />
    </Dialog>

    <!-- Import Dialog -->
    <Dialog v-model:visible="showImport" modal header="Import Collection" class="w-full max-w-xl">
      <ImportForm @done="onImportDone" @close="showImport = false" />
    </Dialog>

    <!-- Card Detail Drawer -->
    <Drawer v-model:visible="showDetail" position="right" class="w-full max-w-md">
      <CardDetailPanel v-if="selectedItem" :entry="selectedItem.entry" :card="selectedItem.card" />
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { useCollection } from '~/composables/useCollection'
import { db } from '~/db'
import type { CollectionEntry, ScryfallCard } from '~/types'

interface CardItem { entry: CollectionEntry; card: ScryfallCard | undefined }

const { getAll } = useCollection()

const allItems = ref<CardItem[]>([])
const filters = ref({ search: '', colors: [] as string[], rarity: '', set: '', onlyOwned: false })
const viewMode = ref<'grid' | 'list'>('grid')
const page = ref(1)
const pageSize = 48
const showAddCard = ref(false)
const showImport = ref(false)
const showDetail = ref(false)
const selectedItem = ref<CardItem | null>(null)

const totalCount = computed(() => allItems.value.reduce((s, i) => s + i.entry.quantity + (i.entry.foilQuantity ?? 0), 0))
const uniqueCount = computed(() => allItems.value.length)

const filtered = computed(() => {
  let items = allItems.value
  const { search, colors, rarity, set } = filters.value

  if (search) {
    const q = search.toLowerCase()
    items = items.filter(i =>
      i.card?.name.toLowerCase().includes(q) ||
      i.card?.type_line?.toLowerCase().includes(q) ||
      i.card?.oracle_text?.toLowerCase().includes(q)
    )
  }
  if (colors.length) {
    items = items.filter(i =>
      colors.every(c => i.card?.color_identity?.includes(c as any))
    )
  }
  if (rarity) items = items.filter(i => i.card?.rarity === rarity)
  if (set) items = items.filter(i => i.card?.set === set)
  return items
})

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

async function load() {
  const entries = await getAll()
  allItems.value = await Promise.all(
    entries.map(async entry => ({
      entry,
      card: await db.scryfallCards.get(entry.scryfallId),
    }))
  )
}

function selectCard(item: CardItem) {
  selectedItem.value = item
  showDetail.value = true
}

function editEntry(item: CardItem) {
  // TODO: open edit dialog
}

async function onCardSaved() {
  showAddCard.value = false
  await load()
}

async function onImportDone() {
  showImport.value = false
  await load()
}

onMounted(load)
</script>
