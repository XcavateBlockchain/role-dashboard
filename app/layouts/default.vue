<script setup lang="ts">
import type { NavIconName } from '~/components/NavIcon.vue'

const route = useRoute()
const config = useRuntimeConfig()

useHead({
  link: [{ rel: 'icon', type: 'image/png', href: '/realxmarket.png' }],
})

const NAV: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/roles', label: 'Roles', icon: 'roles' },
  { to: '/admins', label: 'Admins', icon: 'admins' },
  { to: '/authority', label: 'Authority', icon: 'authority' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div class="min-h-screen bg-page text-ink">
    <!-- Sidebar (md and up) -->
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/50 bg-surface md:flex"
    >
      <div class="flex h-16 items-center border-b border-line/50 px-5">
        <span class="text-base font-extrabold leading-tight">Roles</span>
      </div>
      <nav class="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="flex h-11 items-center gap-3 rounded-full px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :class="
            isActive(item.to)
              ? 'bg-nav-pill text-white'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
          "
        >
          <NavIcon :name="item.icon" />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="flex flex-col gap-3 border-t border-line/50 p-4">
        <ClusterSwitch />
        <div class="flex items-center gap-2">
          <WalletButton class="min-w-0 flex-1" />
          <ThemeToggle />
        </div>
      </div>
    </aside>

    <div class="flex min-h-screen flex-col md:pl-64">
      <!-- Top bar (small screens only): brand + wallet + theme -->
      <header
        class="sticky top-0 z-20 flex items-center gap-3 border-b border-line/50 bg-page px-4 py-1.5 md:hidden"
      >
        <div class="flex min-w-0 flex-col leading-tight">
          <span class="truncate text-sm font-extrabold">realXmarket</span>
          <span class="text-[10px] text-ink-muted">Role Dashboard</span>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-2">
          <WalletButton />
          <ThemeToggle />
        </div>
      </header>

      <main class="flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-5">
        <slot />
      </main>

      <footer
        class="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line/50 px-4 py-4 text-xs text-ink-muted md:px-6"
      >
        <span>xcavate-whitelist program</span>
        <UiAddress :address="config.public.programId" :chars="6" link />
      </footer>
    </div>

    <!-- Bottom nav (small screens) -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line/50 bg-surface px-2 pt-1.5 shadow-bar md:hidden pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      aria-label="Main"
    >
      <NuxtLink
        v-for="item in NAV"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 whitespace-nowrap rounded-card py-1 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :class="isActive(item.to) ? 'text-ink' : 'text-ink-muted'"
      >
        <span
          class="inline-flex h-7 items-center justify-center rounded-full px-3 transition"
          :class="isActive(item.to) ? 'bg-nav-pill text-white' : ''"
        >
          <NavIcon :name="item.icon" :size="18" />
        </span>
        {{ item.label }}
      </NuxtLink>
    </nav>

    <ToastsHost />
  </div>
</template>
