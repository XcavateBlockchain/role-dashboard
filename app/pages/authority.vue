<script setup lang="ts">
import type { ProgramUpgrade } from '~/lib/indexer/types'

const {
  config,
  isAuthority,
  isPendingAuthority,
  loading: accessLoading,
  error: accessError,
  refresh: refreshAccess,
} = useWhitelistAccess()
const { connected } = useWallet()
const indexer = useIndexer()
const tx = useWhitelistTx()
const toast = useToast()

// Gate first render on the initial config fetch so the "initialize config"
// card doesn't flash while config is still unknown (null is a valid result).
const loaded = ref(false)

const upgrades = ref<ProgramUpgrade[]>([])
const upgradesLoading = ref(false)
const upgradesError = ref<string | null>(null)

async function loadUpgrades() {
  upgradesLoading.value = true
  upgradesError.value = null
  try {
    upgrades.value = await indexer.getProgramUpgrades()
  } catch (e) {
    upgradesError.value = e instanceof Error ? e.message : String(e)
  } finally {
    upgradesLoading.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([refreshAccess(), loadUpgrades()])
  } finally {
    loaded.value = true
  }
})

// The indexer trails the chain by a few seconds — one delayed refetch after
// every confirmed write, cleared if the page unmounts first.
let refreshTimer: ReturnType<typeof setTimeout> | undefined

function scheduleRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void refreshAccess()
    void loadUpgrades()
  }, 3000)
}

onUnmounted(() => clearTimeout(refreshTimer))

const newAuthority = ref('')
const proposeError = ref('')
const proposeLoading = ref(false)

async function submitPropose() {
  const candidate = newAuthority.value.trim()
  if (!candidate) {
    proposeError.value = 'Enter the new authority address'
    return
  }
  proposeError.value = ''
  proposeLoading.value = true
  try {
    await tx.updateAuthority(candidate)
    newAuthority.value = ''
    toast.info('The handover completes only after the new key signs Accept authority.')
    scheduleRefresh()
  } catch {
    // Already toasted by useWhitelistTx.
  } finally {
    proposeLoading.value = false
  }
}

const acceptLoading = ref(false)

async function submitAccept() {
  acceptLoading.value = true
  try {
    await tx.acceptAuthority()
    scheduleRefresh()
  } catch {
    // Already toasted by useWhitelistTx.
  } finally {
    acceptLoading.value = false
  }
}

const initializeLoading = ref(false)

async function submitInitialize() {
  initializeLoading.value = true
  try {
    await tx.initializeConfig()
    scheduleRefresh()
  } catch {
    // Already toasted by useWhitelistTx.
  } finally {
    initializeLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Current authority -->
    <UiCard>
      <h2 class="text-sm font-extrabold">Current authority</h2>
      <div v-if="!loaded" class="flex justify-center py-8 text-primary">
        <UiSpinner :size="28" />
      </div>
      <div v-else-if="accessError" class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-sm text-negative">{{ accessError }}</p>
        <UiButton variant="secondary" :loading="accessLoading" @click="refreshAccess">
          Retry
        </UiButton>
      </div>
      <UiEmptyState v-else-if="!config" title="Config not initialized" />
      <div v-else class="mt-3 flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs text-ink-muted">Authority</span>
          <span class="flex items-center gap-2">
            <UiAddress :address="config.authority" :chars="6" link />
            <UiBadge v-if="isAuthority" tone="success">you</UiBadge>
          </span>
        </div>
        <template v-if="config.pendingAuthority">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-ink-muted">Pending authority</span>
            <span class="flex items-center gap-2">
              <UiAddress :address="config.pendingAuthority" :chars="6" link />
              <UiBadge tone="cyan">handover pending</UiBadge>
            </span>
          </div>
        </template>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs text-ink-muted">Updated</span>
          <span class="text-sm">
            {{ formatDateTime(config.updatedAt) }} · slot {{ config.updatedAtSlot.toLocaleString() }}
          </span>
        </div>
      </div>
    </UiCard>

    <!-- Propose new authority -->
    <UiCard>
      <h2 class="text-sm font-extrabold">Propose new authority</h2>
      <UiEmptyState v-if="!isAuthority" title="Authority wallet required" />
      <form v-else class="mt-3 flex flex-col gap-3" @submit.prevent="submitPropose">
        <UiInput
          v-model="newAuthority"
          label="New authority address"
          placeholder="Base58 address of the new authority"
          :error="proposeError"
          :disabled="proposeLoading"
        />
        <div>
          <UiButton type="submit" :loading="proposeLoading">Propose authority</UiButton>
        </div>
      </form>
    </UiCard>

    <!-- Accept handover -->
    <UiCard v-if="config?.pendingAuthority">
      <h2 class="text-sm font-extrabold">Accept handover</h2>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs text-ink-muted">Pending authority</span>
        <UiAddress :address="config.pendingAuthority" :chars="6" link />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UiButton
          :disabled="!isPendingAuthority"
          :loading="acceptLoading"
          @click="submitAccept"
        >
          Accept authority
        </UiButton>
        <p v-if="!isPendingAuthority" class="text-xs text-ink-muted">
          Connect with the pending authority wallet {{ truncateAddress(config.pendingAuthority) }}
        </p>
      </div>
    </UiCard>

    <!-- Initialize config -->
    <UiCard v-if="loaded && !accessError && !config">
      <h2 class="text-sm font-extrabold">Initialize config</h2>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UiButton :disabled="!connected" :loading="initializeLoading" @click="submitInitialize">
          Initialize config
        </UiButton>
        <p v-if="!connected" class="text-xs text-ink-muted">Connect a wallet first</p>
      </div>
    </UiCard>

    <!-- Program upgrades -->
    <UiCardTint>
      <h2 class="text-sm font-extrabold">Program upgrades</h2>
      <div v-if="upgradesLoading && !upgrades.length" class="flex justify-center py-8 text-primary">
        <UiSpinner :size="28" />
      </div>
      <div v-else-if="upgradesError" class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-sm text-negative">{{ upgradesError }}</p>
        <UiButton variant="secondary" :loading="upgradesLoading" @click="loadUpgrades">
          Retry
        </UiButton>
      </div>
      <UiEmptyState v-else-if="!upgrades.length" title="No upgrades recorded" />
      <ul v-else class="mt-2 flex flex-col divide-y divide-line">
        <li
          v-for="upgrade in upgrades"
          :key="upgrade.signature ?? upgrade.upgradeSlot"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-1 last:pb-0"
        >
          <UiBadge :tone="upgrade.source === 'deploy' ? 'neutral' : 'cyan'">
            {{ upgrade.source }}
          </UiBadge>
          <span class="text-sm font-bold">slot {{ upgrade.upgradeSlot.toLocaleString() }}</span>
          <span class="text-xs text-ink-muted">{{ formatDateTime(upgrade.detectedAt) }}</span>
          <ActivityTxLink
            v-if="upgrade.signature"
            :signature="upgrade.signature"
            :chars="6"
            class="ml-auto"
          />
        </li>
      </ul>
    </UiCardTint>
  </div>
</template>
