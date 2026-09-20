<script setup lang="ts">
import type { SyncStatus, WhitelistAction } from '~/lib/indexer/types'
import { ROLES, actionLabel, roleLabel, type RoleMeta } from '~/lib/whitelist/constants'

type BadgeTone = 'neutral' | 'success' | 'error' | 'info' | 'cyan'

const indexer = useIndexer()
const access = useWhitelistAccess()
const cluster = useRuntimeConfig().public.cluster

const loading = ref(true)
const error = ref<string | null>(null)

const stats = ref({ activeAdmins: 0, activeAssignments: 0, compliant: 0, revoked: 0 })
const roleCounts = ref<{ role: RoleMeta; count: number }[]>([])
const recentActions = ref<WhitelistAction[]>([])

const config = access.config
const accessLoading = access.loading
const accessError = access.error

const sync = ref<SyncStatus | null>(null)
const syncError = ref<string | null>(null)
let syncTimer: ReturnType<typeof setInterval> | undefined

const compliantShare = computed(() =>
  stats.value.activeAssignments > 0
    ? Math.round((stats.value.compliant / stats.value.activeAssignments) * 100)
    : null,
)
const revokedShare = computed(() =>
  stats.value.activeAssignments > 0
    ? Math.round((stats.value.revoked / stats.value.activeAssignments) * 100)
    : null,
)

const maxRoleCount = computed(() => Math.max(1, ...roleCounts.value.map((r) => r.count)))

function barWidth(count: number): string {
  if (count <= 0) return '0%'
  return `${Math.max((count / maxRoleCount.value) * 100, 3)}%`
}

function actionTone(action: WhitelistAction): BadgeTone {
  if (action.type === 'PERMISSION_UPDATED') {
    return action.permission === 'COMPLIANT' ? 'success' : 'error'
  }
  if (action.type.startsWith('ROLE_')) return 'neutral'
  return 'info'
}

const syncCells = computed(() => {
  if (!sync.value) return []
  return [
    { label: 'Chain tip', value: sync.value.chainTipSlot.toLocaleString() },
    { label: 'Indexed slot', value: sync.value.lastContiguousSlot.toLocaleString() },
    { label: 'Slot lag', value: sync.value.slotLag.toLocaleString() },
    { label: 'Backfill', value: sync.value.backfillComplete ? 'complete' : 'in progress' },
  ]
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [adminPage, activePage, compliantPage, revokedPage, actionsPage, rolePages] =
      await Promise.all([
        indexer.getAdmins({ active: true }, { first: 1 }),
        indexer.getRoleAssignments({ active: true }, { first: 1 }),
        indexer.getRoleAssignments({ active: true, permission: 'COMPLIANT' }, { first: 1 }),
        indexer.getRoleAssignments({ active: true, permission: 'REVOKED' }, { first: 1 }),
        indexer.getWhitelistActions({}, { first: 10 }),
        Promise.all(
          ROLES.map((role) =>
            indexer.getRoleAssignments({ active: true, role: role.gql }, { first: 1 }),
          ),
        ),
      ])
    stats.value = {
      activeAdmins: adminPage.totalCount,
      activeAssignments: activePage.totalCount,
      compliant: compliantPage.totalCount,
      revoked: revokedPage.totalCount,
    }
    roleCounts.value = ROLES.map((role, i) => ({
      role,
      count: rolePages[i]?.totalCount ?? 0,
    }))
    recentActions.value = actionsPage.nodes
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function loadSync() {
  try {
    sync.value = await indexer.getSyncStatus()
    syncError.value = null
  } catch (e) {
    syncError.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => {
  load()
  loadSync()
  access.refresh()
  syncTimer = setInterval(loadSync, 15_000)
})

onBeforeUnmount(() => {
  clearInterval(syncTimer)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="loading" class="flex justify-center py-20">
      <UiSpinner :size="28" />
    </div>

    <UiCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-sm font-extrabold text-negative">{{ error }}</p>
        <UiButton variant="secondary" @click="load">Retry</UiButton>
      </div>
    </UiCard>

    <template v-else>
      <!-- Stat cells -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <UiStatCell title="Active admins" :value="stats.activeAdmins" />
        <UiStatCell title="Active assignments" :value="stats.activeAssignments" />
        <UiStatCell title="Compliant" :value="stats.compliant">
          <span class="text-xs font-extrabold text-positive">
            {{ compliantShare === null ? '—' : `${compliantShare}% of active` }}
          </span>
        </UiStatCell>
        <UiStatCell title="Revoked" :value="stats.revoked">
          <span class="text-xs font-extrabold text-negative">
            {{ revokedShare === null ? '—' : `${revokedShare}% of active` }}
          </span>
        </UiStatCell>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Config -->
        <UiCard>
          <h2 class="mb-3 text-sm font-extrabold">Configuration</h2>
          <dl v-if="config" class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
              <dt class="shrink-0 text-xs text-ink-muted">Authority</dt>
              <dd><UiAddress :address="config.authority" :chars="6" link /></dd>
            </div>
            <div
              v-if="config.pendingAuthority"
              class="flex items-center justify-between gap-3"
            >
              <dt class="shrink-0 text-xs text-ink-muted">Pending authority</dt>
              <dd class="flex flex-wrap items-center justify-end gap-2">
                <UiAddress :address="config.pendingAuthority" :chars="6" link />
                <UiBadge tone="cyan">handover pending</UiBadge>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="shrink-0 text-xs text-ink-muted">Updated at slot</dt>
              <dd class="font-mono text-[13px]">{{ config.updatedAtSlot.toLocaleString() }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="shrink-0 text-xs text-ink-muted">Last updated</dt>
              <dd class="text-xs">{{ formatDateTime(config.updatedAt) }}</dd>
            </div>
          </dl>
          <div v-else-if="accessLoading" class="flex justify-center py-8">
            <UiSpinner />
          </div>
          <div v-else-if="accessError" class="flex flex-col items-center gap-3 py-6 text-center">
            <p class="text-xs text-negative">{{ accessError }}</p>
            <UiButton variant="secondary" @click="access.refresh()">Retry</UiButton>
          </div>
          <UiEmptyState v-else title="Whitelist not initialized">
            <template #icon>
              <NavIcon name="authority" :size="28" />
            </template>
            <p class="text-xs text-ink-muted">
              Connect the authority wallet and initialize the config from the
              <NuxtLink to="/authority" class="font-extrabold text-primary underline"
                >Authority page</NuxtLink
              >.
            </p>
          </UiEmptyState>
        </UiCard>

        <!-- Sync status -->
        <UiCardTint>
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="text-sm font-extrabold">Indexer sync</h2>
            <UiBadge v-if="sync" :tone="sync.slotLag < 50 ? 'success' : 'error'">
              {{ sync.slotLag < 50 ? 'in sync' : 'lagging' }}
            </UiBadge>
          </div>
          <div v-if="sync" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div v-for="cell in syncCells" :key="cell.label" class="flex flex-col gap-0.5">
              <span class="text-xs text-ink-muted">{{ cell.label }}</span>
              <span class="text-sm font-extrabold">{{ cell.value }}</span>
            </div>
          </div>
          <UiEmptyState v-else-if="syncError" title="Sync status unavailable" :hint="syncError">
            <UiButton variant="secondary" class="mt-2" @click="loadSync">Retry</UiButton>
          </UiEmptyState>
          <div v-else class="flex justify-center py-8">
            <UiSpinner />
          </div>
        </UiCardTint>
      </div>

      <!-- Role distribution -->
      <UiCard>
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="text-sm font-extrabold">Role distribution</h2>
          <span class="text-xs text-ink-muted">{{ stats.activeAssignments }} active</span>
        </div>
        <div v-if="stats.activeAssignments > 0" class="flex flex-col gap-2.5">
          <div
            v-for="{ role, count } in roleCounts"
            :key="role.gql"
            class="flex items-center gap-3"
            :title="role.description"
          >
            <span class="w-28 shrink-0 truncate text-xs sm:w-40">{{ role.label }}</span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{ width: barWidth(count) }"
              />
            </div>
            <span class="w-10 shrink-0 text-right text-xs font-extrabold">{{ count }}</span>
          </div>
        </div>
        <UiEmptyState
          v-else
          title="No active assignments"
          hint="Assign a role from the Roles page to see the distribution."
        >
          <template #icon>
            <NavIcon name="roles" :size="28" />
          </template>
        </UiEmptyState>
      </UiCard>

      <!-- Recent activity -->
      <UiCard>
        <h2 class="mb-1 text-sm font-extrabold">Recent activity</h2>
        <div v-if="recentActions.length" class="flex flex-col divide-y divide-line/50">
          <div
            v-for="action in recentActions"
            :key="action.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5"
          >
            <UiBadge :tone="actionTone(action)">{{ actionLabel(action.type) }}</UiBadge>
            <UiAddress v-if="action.subject" :address="action.subject" />
            <span v-if="action.role" class="text-xs text-ink-muted">{{
              roleLabel(action.role)
            }}</span>
            <span class="ml-auto shrink-0 text-xs text-ink-muted">{{
              timeAgo(action.blockTime)
            }}</span>
            <a
              :href="explorerTxUrl(action.txSignature, cluster)"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View transaction on Solana Explorer"
              class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>
        </div>
        <UiEmptyState
          v-else
          title="No activity yet"
          hint="Indexed whitelist instructions will appear here."
        >
          <template #icon>
            <NavIcon name="activity" :size="28" />
          </template>
        </UiEmptyState>
        <div class="mt-3 flex justify-center">
          <UiButton variant="ghost" @click="navigateTo('/activity')">View all</UiButton>
        </div>
      </UiCard>
    </template>
  </div>
</template>
