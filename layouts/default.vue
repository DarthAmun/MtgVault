<template>
  <!-- Full-viewport gradient background -->
  <div class="h-screen w-screen overflow-hidden p-3"
       style="background: linear-gradient(135deg, #ede9fe 0%, #e0e7ff 45%, #fae8ff 100%)">

    <!-- Unified glass shell -->
    <div class="h-full rounded-3xl overflow-hidden flex shadow-glass-lg"
         style="background: rgba(255,255,255,0.78); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.90);">

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <aside
        class="flex flex-col shrink-0 transition-all duration-200"
        :class="collapsed ? 'w-16' : 'w-56'"
        style="border-right: 1px solid rgba(124,58,237,0.10);"
      >
        <!-- Brand -->
        <div class="flex items-center gap-3 px-4 py-5 shrink-0"
             style="border-bottom: 1px solid rgba(124,58,237,0.08);">
          <div class="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-accent"
               style="background: linear-gradient(135deg, #7c3aed, #9333ea);">
            <span class="text-white font-display text-sm font-bold">M</span>
          </div>
          <div v-if="!collapsed" class="overflow-hidden">
            <p class="font-display text-vault-text text-sm font-bold leading-none tracking-wide">MTG</p>
            <p class="text-vault-accent text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5">Vault</p>
          </div>
        </div>

        <!-- Nav items -->
        <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <NavItem to="/"           icon="fa-home"      label="Dashboard"  :collapsed="collapsed" />
          <NavItem to="/collection" icon="fa-th-large"  label="Collection" :collapsed="collapsed" />
          <NavItem to="/decks"      icon="fa-book"      label="Decks"      :collapsed="collapsed" />
          <NavItem to="/scan"       icon="fa-camera"    label="Scanner"    :collapsed="collapsed" badge="NEW" />
          <NavItem to="/stats"      icon="fa-chart-bar" label="Stats"      :collapsed="collapsed" />
          <NavItem to="/proxies"    icon="fa-print"     label="Proxies"    :collapsed="collapsed" />
        </nav>

        <!-- Settings + collapse -->
        <div class="shrink-0 px-2 pb-3 space-y-0.5"
             style="border-top: 1px solid rgba(124,58,237,0.08);">
          <div class="pt-2">
            <NavItem to="/settings" icon="fa-cog" label="Settings" :collapsed="collapsed" />
          </div>
          <button
            class="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-vault-muted hover:text-vault-accent transition-colors text-xs font-medium hover:bg-violet-50"
            @click="collapsed = !collapsed"
          >
            <v-icon :name="collapsed ? 'fa-chevron-right' : 'fa-chevron-left'" />
            <span v-if="!collapsed">Collapse</span>
          </button>
        </div>
      </aside>

      <!-- ── Content ─────────────────────────────────────────────────────── -->
      <main class="flex-1 min-w-0 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const collapsed = ref(false)
</script>
