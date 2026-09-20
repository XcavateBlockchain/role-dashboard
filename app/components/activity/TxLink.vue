<script setup lang="ts">
const props = withDefaults(defineProps<{ signature: string; chars?: number }>(), {
  chars: 4,
})

const cluster = useRuntimeConfig().public.cluster
const txUrl = computed(() => explorerTxUrl(props.signature, cluster))
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <UiAddress :address="signature" :chars="chars" />
    <a
      :href="txUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="View transaction on Solana Explorer"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    </a>
  </span>
</template>
