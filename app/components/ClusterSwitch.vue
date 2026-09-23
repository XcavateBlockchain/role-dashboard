<script setup lang="ts">
type ClusterOption = { id: string; label: string; enabled: boolean }

const config = useRuntimeConfig()

// Mainnet stays visible but disabled until the program and indexer are live there.
const CLUSTERS: ClusterOption[] = [
  { id: 'devnet', label: 'Devnet', enabled: true },
  { id: 'mainnet', label: 'Mainnet', enabled: false },
]

const active = computed(() => config.public.cluster)

function select(cluster: ClusterOption) {
  if (!cluster.enabled || cluster.id === active.value) return
  // Cluster switching lands with mainnet support: RPC, indexer and program ID
  // all come from runtime config keyed by cluster.
}
</script>

<template>
  <div
    class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-badge p-0.5"
    role="group"
    aria-label="Solana cluster"
  >
    <button
      v-for="cluster in CLUSTERS"
      :key="cluster.id"
      type="button"
      class="rounded-full px-2.5 py-0.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="
        cluster.id === active
          ? 'bg-tertiary text-white'
          : 'text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-ink-muted'
      "
      :disabled="!cluster.enabled"
      :aria-pressed="cluster.id === active"
      :title="cluster.enabled ? `Switch to ${cluster.label}` : `${cluster.label} is not available yet`"
      @click="select(cluster)"
    >
      {{ cluster.label }}
    </button>
  </div>
</template>
