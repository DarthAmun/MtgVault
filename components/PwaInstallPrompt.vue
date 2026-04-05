<template>
  <Transition name="slide-up">
    <div
      v-if="canInstall"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-vault-border bg-vault-surface"
      style="backdrop-filter: blur(12px);"
    >
      <v-icon name="fa-download" class="text-vault-accent shrink-0" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-vault-text">Install MTG Vault</p>
        <p class="text-xs text-vault-muted">Add to home screen for offline use</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button class="text-xs text-vault-muted hover:text-vault-text px-2 py-1" @click="dismiss">Later</button>
        <Button label="Install" size="small" @click="install" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const canInstall = ref(false)
let deferredPrompt: any = null

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  })
  window.addEventListener('appinstalled', () => {
    canInstall.value = false
    deferredPrompt = null
  })
})

async function install() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') canInstall.value = false
  deferredPrompt = null
}

function dismiss() {
  canInstall.value = false
}
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translate(-50%, 1rem); }
</style>
