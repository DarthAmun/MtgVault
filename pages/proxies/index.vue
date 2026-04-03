<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-3xl text-vault-gold">Proxies</h1>
        <p class="text-vault-muted text-sm mt-1">{{ proxies.length }} proxy cards</p>
      </div>
      <div class="flex gap-2">
        <Button label="Create Custom Card" outlined @click="showCustom = true">
          <template #icon><v-icon name="fa-plus" class="mr-2" /></template>
        </Button>
        <Button label="Print All" @click="printAll" :disabled="!proxies.length">
          <template #icon><v-icon name="fa-print" class="mr-2" /></template>
        </Button>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="proxies.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <div
        v-for="item in proxies"
        :key="item.entry.id"
        class="group relative cursor-pointer"
      >
        <div class="relative aspect-[63/88] rounded-lg overflow-hidden bg-vault-surface2">
          <img
            v-if="item.imageUri"
            :src="item.imageUri"
            :alt="item.name"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button class="p-2 rounded-full bg-black/70 text-white" @click="printSingle(item)">
              <v-icon name="fa-print" />
            </button>
          </div>
          <div class="absolute bottom-1 left-1 right-1 text-center">
            <span class="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80">PROXY</span>
          </div>
        </div>
        <p class="mt-1 text-xs text-vault-muted truncate">{{ item.name }}</p>
      </div>
    </div>

    <div v-else class="text-center py-20 text-vault-muted">
      <v-icon name="fa-print" scale="2" class="mb-3" />
      <p>No proxies yet. Mark cards as proxy when adding them.</p>
    </div>

    <!-- Custom Card Dialog -->
    <Dialog v-model:visible="showCustom" modal header="Create Custom Card" class="w-full max-w-2xl">
      <CustomCardEditor @saved="onCustomSaved" @close="showCustom = false" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useCollection } from '~/composables/useCollection'
import { db } from '~/db'

const { getProxies } = useCollection()
const showCustom = ref(false)

interface ProxyItem {
  entry: any
  name: string
  imageUri?: string
}

const proxies = ref<ProxyItem[]>([])

async function load() {
  const entries = await getProxies()
  proxies.value = await Promise.all(
    entries.map(async entry => {
      const card = await db.scryfallCards.get(entry.scryfallId)
      return {
        entry,
        name: card?.name ?? entry.scryfallId,
        imageUri: card?.image_uris?.normal ?? card?.card_faces?.[0]?.image_uris?.normal,
      }
    })
  )
}

async function onCustomSaved() {
  showCustom.value = false
  await load()
}

function printSingle(_item: ProxyItem) {
  // TODO: generate single-card PDF via jsPDF
  alert('Print single proxy — implement with jsPDF')
}

function printAll() {
  // TODO: generate print sheet PDF (3x3 grid per page)
  alert('Print all proxies — implement with jsPDF')
}

onMounted(load)
</script>
