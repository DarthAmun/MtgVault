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
        <Button label="Custom Card" outlined @click="openCustomCard()">
          <template #icon><v-icon name="fa-magic" class="mr-2" /></template>
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
      <span class="text-vault-muted text-sm ml-auto">{{ filteredGroups.length }} cards</span>
    </div>

    <!-- Card grid (grouped) -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <CollectionCardThumb
        v-for="group in paginatedGroups"
        :key="group.name"
        :entry="group.items[0].entry"
        :card="group.items[0].card"
        :stack-count="group.items.length"
        @click="selectGroup(group)"
        @edit="editEntry(group.items[0])"
        @versions="openVersions(group)"
      />
    </div>

    <!-- List view (flat) -->
    <div v-else class="space-y-1">
      <CollectionListRow
        v-for="item in paginatedFlat"
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
        :total-records="viewMode === 'grid' ? filteredGroups.length : filtered.length"
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

    <!-- Edit Dialog -->
    <Dialog v-model:visible="showEdit" modal header="Edit Card" class="w-full max-w-lg">
      <EditCardForm
        v-if="editItem && !editItem.entry.isCustom"
        :entry="editItem.entry"
        :card="editItem.card"
        @saved="onEditSaved"
        @deleted="onEditSaved"
        @close="showEdit = false"
      />
    </Dialog>

    <!-- Custom Card Editor Dialog -->
    <Dialog v-model:visible="showCustomEditor" modal header="Custom Card" class="w-full max-w-4xl">
      <CustomCardEditor
        :existing-card="editingCustomCard ?? undefined"
        @saved="onCustomSaved"
        @deleted="onCustomSaved"
        @close="showCustomEditor = false"
      />
    </Dialog>

    <!-- Versions Dialog -->
    <Dialog v-model:visible="showVersions" modal :header="versionsGroup?.name ?? 'Versions'" class="w-full max-w-lg">
      <div v-if="versionsGroup" class="space-y-2">
        <p class="text-xs text-vault-muted mb-3">
          {{ versionsGroup.items.length }} version{{ versionsGroup.items.length !== 1 ? 's' : '' }} in your collection
        </p>
        <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <div
          v-for="item in versionsGroup.items"
          :key="item.entry.id"
          class="flex items-center gap-3 p-3 bg-vault-surface2 rounded-xl"
        >
          <img
            v-if="item.card?.image_uris?.small ?? item.card?.card_faces?.[0]?.image_uris?.small"
            :src="item.card?.image_uris?.small ?? item.card?.card_faces?.[0]?.image_uris?.small"
            :alt="item.card?.name"
            class="w-10 h-14 object-cover rounded shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">{{ item.card?.set_name }}</p>
              <span
                v-if="item.entry.isProxy"
                class="text-[10px] font-bold px-1.5 py-px rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0"
              >PROXY</span>
            </div>
            <p class="text-xs text-vault-muted">#{{ item.card?.collector_number }} · {{ item.entry.condition }}</p>
            <p class="text-xs text-vault-dim">
              {{ item.entry.quantity }}× normal
              <span v-if="(item.entry.foilQuantity ?? 0) > 0" class="text-vault-gold ml-1">· {{ item.entry.foilQuantity }}× foil</span>
            </p>
            <p v-if="!item.entry.isProxy && item.card?.prices?.usd" class="text-[11px] text-vault-gold mt-0.5">
              ${{ item.card.prices.usd }}
            </p>
          </div>
          <div class="flex flex-col gap-1 shrink-0">
            <button
              class="text-xs px-2 py-1 rounded bg-vault-accent/10 text-vault-accent hover:bg-vault-accent/20 transition-colors"
              @click="editEntry(item); showVersions = false"
            >
              Edit
            </button>
            <button
              class="text-xs px-2 py-1 rounded bg-vault-surface3 text-vault-muted hover:text-vault-text transition-colors"
              @click="selectCard(item); showVersions = false"
            >
              Details
            </button>
          </div>
        </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useCollection } from '~/composables/useCollection'
import { useCustomCards, CUSTOM_ID_PREFIX } from '~/composables/useCustomCards'
import { db } from '~/db'
import type { CollectionEntry, CustomCard, ScryfallCard } from '~/types'

interface CardItem { entry: CollectionEntry; card: ScryfallCard | undefined }
interface CardGroup { name: string; items: CardItem[] }

const { getAll } = useCollection()
const { getById: getCustomById } = useCustomCards()

const allItems = ref<CardItem[]>([])
const filters = ref({ search: '', colors: [] as string[], rarity: '', set: '', onlyOwned: false })
const viewMode = ref<'grid' | 'list'>('grid')
const page = ref(1)
const pageSize = 48
const showAddCard = ref(false)
const showImport = ref(false)
const showDetail = ref(false)
const showEdit = ref(false)
const showCustomEditor = ref(false)
const showVersions = ref(false)
const selectedItem = ref<CardItem | null>(null)
const editItem = ref<CardItem | null>(null)
const editingCustomCard = ref<CustomCard | null>(null)
const versionsGroup = ref<CardGroup | null>(null)

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
    items = items.filter(i => colors.every(c => i.card?.color_identity?.includes(c as any)))
  }
  if (rarity) items = items.filter(i => i.card?.rarity === rarity)
  if (set) items = items.filter(i => i.card?.set === set)
  return items
})

// Group by oracle card name for grid view
const filteredGroups = computed((): CardGroup[] => {
  const map = new Map<string, CardGroup>()
  for (const item of filtered.value) {
    const key = item.card?.name ?? item.entry.scryfallId
    if (!map.has(key)) map.set(key, { name: key, items: [] })
    map.get(key)!.items.push(item)
  }
  return [...map.values()]
})

const paginatedGroups = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredGroups.value.slice(start, start + pageSize)
})

const paginatedFlat = computed(() => {
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

function selectGroup(group: CardGroup) {
  if (group.items.length === 1) {
    selectCard(group.items[0])
  } else {
    openVersions(group)
  }
}

function selectCard(item: CardItem) {
  selectedItem.value = item
  showDetail.value = true
}

async function editEntry(item: CardItem) {
  editItem.value = item
  if (item.entry.isCustom) {
    // Open canvas editor for custom cards
    const customId = item.entry.scryfallId.replace(CUSTOM_ID_PREFIX, '')
    editingCustomCard.value = await getCustomById(customId)
    showCustomEditor.value = true
  } else {
    showEdit.value = true
  }
}

function openCustomCard(card: CustomCard | null = null) {
  editingCustomCard.value = card
  showCustomEditor.value = true
}

async function onCustomSaved() {
  showCustomEditor.value = false
  editingCustomCard.value = null
  await load()
}

function openVersions(group: CardGroup) {
  versionsGroup.value = group
  showVersions.value = true
}

async function onEditSaved() {
  showEdit.value = false
  await load()
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
