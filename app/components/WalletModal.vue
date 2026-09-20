<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { wallets, connecting, connect } = useWallet()
const toast = useToast()

async function pick(name: string) {
  try {
    await connect(name)
    emit('close')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : `Could not connect to ${name}.`)
  }
}
</script>

<template>
  <UiModal :open="props.open" title="Connect wallet" @close="emit('close')">
    <div v-if="wallets.length" class="flex flex-col gap-2">
      <button
        v-for="w in wallets"
        :key="w.name"
        type="button"
        :disabled="connecting"
        class="flex h-12 items-center gap-3 rounded-card border border-line bg-surface px-4 text-sm font-bold transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        @click="pick(w.name)"
      >
        <img v-if="w.icon" :src="w.icon" alt="" class="h-6 w-6 rounded-full" />
        <span class="flex-1 text-left">{{ w.name }}</span>
        <UiSpinner v-if="connecting" :size="16" />
      </button>
    </div>
    <UiEmptyState
      v-else
      title="No wallets detected"
      hint="Install a Solana wallet browser extension to continue."
    >
      <template #icon>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
        </svg>
      </template>
      <div class="mt-3 flex gap-2">
        <a
          href="https://phantom.com/download"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-9 items-center rounded-full border-2 border-primary px-4 text-sm font-bold text-primary transition hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Phantom
        </a>
        <a
          href="https://solflare.com/download"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-9 items-center rounded-full border-2 border-primary px-4 text-sm font-bold text-primary transition hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Solflare
        </a>
      </div>
    </UiEmptyState>
  </UiModal>
</template>
