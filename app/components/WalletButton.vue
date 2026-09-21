<script setup lang="ts">
const { address, connected, connecting, disconnect } = useWallet()
const toast = useToast()

const modalOpen = ref(false)
const menuOpen = ref(false)

const shortAddress = computed(() =>
  address.value ? `${address.value.slice(0, 4)}…${address.value.slice(-4)}` : '',
)

async function copyAddress() {
  if (!address.value) return
  try {
    await navigator.clipboard.writeText(address.value)
    toast.success('Address copied.')
  } catch {
    toast.error('Could not copy the address.')
  }
  menuOpen.value = false
}

async function onDisconnect() {
  menuOpen.value = false
  await disconnect()
}
</script>

<template>
  <div class="relative">
    <UiButton v-if="!connected" :loading="connecting" class="w-full" @click="modalOpen = true">
      Connect wallet
    </UiButton>

    <button
      v-else
      type="button"
      class="inline-flex h-12 w-full items-center gap-2 rounded-button border-2 border-primary px-4 text-sm font-extrabold text-primary transition hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      @click="menuOpen = !menuOpen"
    >
      <span class="h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
      <span class="font-mono text-[13px]">{{ shortAddress }}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      v-if="menuOpen"
      class="fixed inset-0 z-40 cursor-default"
      aria-hidden="true"
      @click="menuOpen = false"
    />
    <div
      v-if="menuOpen"
      role="menu"
      class="absolute bottom-full right-0 z-50 mb-2 w-44 rounded-card bg-surface p-1 shadow-card"
    >
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-card px-3 py-2 text-sm font-bold transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @click="copyAddress"
      >
        Copy address
      </button>
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-card px-3 py-2 text-sm font-bold text-negative transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @click="onDisconnect"
      >
        Disconnect
      </button>
    </div>

    <WalletModal :open="modalOpen" @close="modalOpen = false" />
  </div>
</template>
