<template>
  <!-- Full-viewport gradient background -->
  <div class="h-screen w-screen overflow-hidden md:p-3"
       style="background: linear-gradient(135deg, #ede9fe 0%, #e0e7ff 45%, #fae8ff 100%)">

    <!-- Unified glass shell -->
    <div class="h-full flex flex-col md:flex-row md:rounded-3xl overflow-hidden shadow-glass-lg"
         style="background: rgba(255,255,255,0.78); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.90);">

      <!-- ── Mobile top bar (first in DOM = top of screen) ────────────────── -->
      <div class="md:hidden shrink-0 flex items-center justify-between px-4 py-3"
           style="border-bottom: 1px solid rgba(124,58,237,0.10); background: rgba(255,255,255,0.6);">
        <div class="flex items-center gap-2.5">
          <img src="/assets/logo.png" class="w-8 h-8 rounded-lg" />
          <div>
            <span class="font-display text-vault-text text-sm font-bold leading-none tracking-wide">MTG</span>
            <span class="text-vault-accent text-[10px] font-bold tracking-[0.2em] uppercase ml-1">Vault</span>
          </div>
        </div>
        <NuxtLink to="/settings" class="p-2 rounded-xl text-vault-muted hover:text-vault-accent hover:bg-violet-50 transition-colors">
          <v-icon name="fa-cog" />
        </NuxtLink>
      </div>

      <!-- ── Sidebar (tablet/desktop only) ────────────────────────────────── -->
      <aside
        class="hidden md:flex flex-col shrink-0 transition-all duration-200"
        :class="collapsed ? 'w-16' : 'w-56'"
        style="border-right: 1px solid rgba(124,58,237,0.10);"
      >
        <!-- Brand -->
        <div class="flex items-center gap-3 px-2 py-5 shrink-0"
             style="border-bottom: 1px solid rgba(124,58,237,0.08);">
          <div class="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center shadow-accent">
            <img src="/assets/logo.png"/>
          </div>
          <div v-if="!collapsed" class="overflow-hidden">
            <p class="font-display text-vault-text text-sm font-bold leading-none tracking-wide">MTG</p>
            <p class="text-vault-accent text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5">Vault</p>
          </div>
        </div>

        <!-- Nav items -->
        <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <NavItem to="/"           icon="fa-home"        label="Dashboard"    :collapsed="collapsed" />
          <NavItem to="/collection" icon="fa-th-large"    label="Collection"   :collapsed="collapsed" />
          <NavItem to="/decks"      icon="fa-book"        label="Decks"        :collapsed="collapsed" />
          <NavItem to="/scan"       icon="fa-file-import" label="Bulk Import"  :collapsed="collapsed" />
          <NavItem to="/stats"      icon="fa-chart-bar"   label="Stats"        :collapsed="collapsed" />
          <NavItem to="/proxies"    icon="fa-print"       label="Proxies"      :collapsed="collapsed" />
          <NavItem to="/game-tools" icon="fa-dice"         label="Game Tools"   :collapsed="collapsed" />
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

      <!-- ── Main content ──────────────────────────────────────────────────── -->
      <main class="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <slot />
      </main>

      <!-- ── Mobile bottom nav (last in DOM = bottom of screen) ───────────── -->
      <nav class="md:hidden shrink-0 flex items-center justify-around px-1 py-1"
           style="border-top: 1px solid rgba(124,58,237,0.10); background: rgba(255,255,255,0.95);">
        <MobileNavItem to="/"           icon="fa-home"        label="Home"       />
        <MobileNavItem to="/collection" icon="fa-th-large"    label="Collection" />
        <MobileNavItem to="/decks"      icon="fa-book"        label="Decks"      />
        <MobileNavItem to="/proxies"    icon="fa-print"       label="Proxies"    />
        <MobileNavItem to="/game-tools" icon="fa-dice"         label="Tools"      />
        <MobileNavItem to="/stats"      icon="fa-chart-bar"   label="Stats"      />
        <MobileNavItem to="/scan"       icon="fa-file-import" label="Import"     />
      </nav>
    </div>
  </div>

  <PwaInstallPrompt />
</template>

<script setup lang="ts">
const collapsed = ref(false)
</script>
