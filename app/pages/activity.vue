<script setup lang="ts">
import type { WhitelistAction } from '~/lib/indexer/types'
import { ACTION_TYPES, actionLabel, roleLabel } from '~/lib/whitelist/constants'

type BadgeTone = 'neutral' | 'success' | 'error' | 'info' | 'cyan'

interface ActionFilters {
  type: string
  subject: string
  actor: string
  txSignature: string
}

const PAGE_SIZE = 20
const AUTO_REFRESH_MS = 30_000

const emptyFilters = (): ActionFilters => ({ type: '', subject: '', actor: '', txSignature: '' })

const { getWhitelistActions } = useIndexer()

/** Edited in the form; copied to `active` on Apply. */
const draft = reactive<ActionFilters>(emptyFilters())
/** Filters the current listing was fetched with. */
const active = reactive<ActionFilters>(emptyFilters())

const rows = ref<WhitelistAction[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

let seq = 0
let refreshTimer: ReturnType<typeof setInterval> | undefined

const hasActiveFilters = computed(
  () => !!(active.type || active.subject || active.actor || active.txSignature),
)
const hasDraftFilters = computed(
  () => !!(draft.type || draft.subject.trim() || draft.actor.trim() || draft.txSignature.trim()),
)
const hasRows = computed(() => rows.value.length > 0)

async function fetchPage() {
  const id = ++seq
  loading.value = true
  error.value = null
  try {
    const res = await getWhitelistActions(
      {
        type: active.type || undefined,
        subject: active.subject || undefined,
        actor: active.actor || undefined,
        txSignature: active.txSignature || undefined,
      },
      { first: PAGE_SIZE, offset: offset.value },
    )
    if (id !== seq) return
    rows.value = res.nodes
    total.value = res.totalCount
  } catch (e) {
    if (id !== seq) return
    error.value = e instanceof Error ? e.message : 'Failed to load activity'
  } finally {
    if (id === seq) loading.value = false
  }
}

function stopAutoRefresh() {
  clearInterval(refreshTimer)
  refreshTimer = undefined
}

/** Poll only while the unfiltered feed is shown; applied filters freeze the listing. */
function syncAutoRefresh() {
  stopAutoRefresh()
  if (!hasActiveFilters.value) {
    refreshTimer = setInterval(fetchPage, AUTO_REFRESH_MS)
  }
}

function apply() {
  active.type = draft.type
  active.subject = draft.subject.trim()
  active.actor = draft.actor.trim()
  active.txSignature = draft.txSignature.trim()
  offset.value = 0
  syncAutoRefresh()
  fetchPage()
}

function clear() {
  Object.assign(draft, emptyFilters())
  Object.assign(active, emptyFilters())
  offset.value = 0
  syncAutoRefresh()
  fetchPage()
}

function onPage(nextOffset: number) {
  offset.value = nextOffset
  fetchPage()
}

function actionTone(action: WhitelistAction): BadgeTone {
  if (action.type.startsWith('CONFIG_') || action.type.startsWith('AUTHORITY_')) return 'info'
  if (action.type.startsWith('ADMIN_')) return 'cyan'
  if (action.type === 'ROLE_ASSIGNED') return 'success'
  if (action.type === 'ROLE_REMOVED' || action.type === 'ROLE_RENOUNCED') return 'error'
  if (action.type === 'PERMISSION_UPDATED') {
    return action.permission === 'COMPLIANT' ? 'success' : 'error'
  }
  return 'neutral'
}

onMounted(() => {
  fetchPage()
  syncAutoRefresh()
})

onBeforeUnmount(stopAutoRefresh)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiCard>
      <form class="flex flex-col gap-3" @submit.prevent="apply">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <UiSelect v-model="draft.type" label="Action">
            <option value="">All</option>
            <option v-for="t in ACTION_TYPES" :key="t.gql" :value="t.gql">{{ t.label }}</option>
          </UiSelect>
          <UiInput v-model="draft.subject" label="Subject address" placeholder="base58 address" />
          <UiInput v-model="draft.actor" label="Actor address" placeholder="base58 address" />
          <UiInput v-model="draft.txSignature" label="Tx signature" placeholder="base58 signature" />
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <UiButton variant="secondary" :disabled="!hasDraftFilters && !hasActiveFilters" @click="clear">
            Clear
          </UiButton>
          <UiButton type="submit" variant="secondary" :loading="loading">Apply</UiButton>
        </div>
      </form>
    </UiCard>

    <UiCard :padded="false">
      <div v-if="loading && !hasRows" class="flex justify-center py-16 text-primary">
        <UiSpinner :size="28" />
      </div>

      <div v-else-if="error && !hasRows" class="flex flex-col items-center gap-3 py-16">
        <p class="max-w-md px-4 text-center text-sm text-negative">{{ error }}</p>
        <UiButton variant="secondary" @click="fetchPage">Retry</UiButton>
      </div>

      <UiEmptyState
        v-else-if="!hasRows"
        :title="hasActiveFilters ? 'No actions match these filters' : 'No actions yet'"
        :hint="
          hasActiveFilters
            ? 'Try widening the filters or clearing them.'
            : 'No actions recorded yet — the indexer may still be backfilling.'
        "
      >
        <template #icon>
          <NavIcon name="activity" :size="28" />
        </template>
      </UiEmptyState>

      <template v-else>
        <UiTable>
          <template #thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Subject</th>
              <th>Role</th>
              <th>Permission</th>
              <th>Actor</th>
              <th>Slot</th>
              <th>Tx</th>
            </tr>
          </template>
          <template #tbody>
            <tr v-for="action in rows" :key="action.id">
              <td class="whitespace-nowrap">
                <span :title="formatDateTime(action.blockTime)">{{ timeAgo(action.blockTime) }}</span>
              </td>
              <td>
                <UiBadge :tone="actionTone(action)">{{ actionLabel(action.type) }}</UiBadge>
              </td>
              <td>
                <UiAddress v-if="action.subject" :address="action.subject" />
                <span v-else class="text-ink-muted">—</span>
              </td>
              <td>
                <span v-if="action.role">{{ roleLabel(action.role) }}</span>
                <span v-else class="text-ink-muted">—</span>
              </td>
              <td>
                <UiBadge
                  v-if="action.permission"
                  :tone="action.permission === 'COMPLIANT' ? 'success' : 'error'"
                >
                  {{ action.permission === 'COMPLIANT' ? 'Compliant' : 'Revoked' }}
                </UiBadge>
                <span v-else class="text-ink-muted">—</span>
              </td>
              <td>
                <UiAddress :address="action.actor" />
              </td>
              <td class="whitespace-nowrap font-mono text-[13px]">{{ action.slot }}</td>
              <td>
                <ActivityTxLink :signature="action.txSignature" :chars="4" />
              </td>
            </tr>
          </template>
        </UiTable>

        <div
          v-if="error"
          class="flex flex-wrap items-center justify-between gap-2 border-t border-line/50 px-3 py-2"
        >
          <p class="text-xs text-negative">{{ error }}</p>
          <button
            type="button"
            class="text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="fetchPage"
          >
            Retry
          </button>
        </div>

        <div class="flex items-center gap-3 border-t border-line/50 px-3 py-3">
          <div class="flex-1">
            <UiPagination :total="total" :first="PAGE_SIZE" :offset="offset" @update="onPage" />
          </div>
          <UiSpinner v-if="loading" :size="16" class="shrink-0 text-primary" />
        </div>
      </template>
    </UiCard>
  </div>
</template>
