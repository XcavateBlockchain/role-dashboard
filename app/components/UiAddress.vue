<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    address: string
    /** Characters kept on each side of the ellipsis. */
    chars?: number
    /** Link out to the Solana explorer. */
    link?: boolean
  }>(),
  { chars: 4, link: false },
)

const cluster = useRuntimeConfig().public.cluster

const short = computed(() =>
  props.address.length <= props.chars * 2 + 3
    ? props.address
    : `${props.address.slice(0, props.chars)}…${props.address.slice(-props.chars)}`,
)

const explorerUrl = computed(
  () => `https://explorer.solana.com/address/${props.address}?cluster=${cluster}`,
)

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.address)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard unavailable (permissions / insecure context)
  }
}
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <span class="font-mono text-[13px]" :title="address">{{ short }}</span>
    <button
      type="button"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="copied ? 'text-positive' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'"
      :aria-label="copied ? 'Address copied' : 'Copy address'"
      @click="copy"
    >
      <svg v-if="copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
      </svg>
    </button>
    <a
      v-if="link"
      :href="explorerUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="View on Solana Explorer"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    </a>
  </span>
</template>
