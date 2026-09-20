<script setup lang="ts">
import type { IndexerAdmin } from '~/lib/indexer/types'

type AdminFilter = 'active' | 'removed' | 'all'

const FILTERS: { key: AdminFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'removed', label: 'Removed' },
  { key: 'all', label: 'All' },
]

const PAGE_SIZE = 20

const indexer = useIndexer()
const access = useWhitelistAccess()
const { config, isAuthority } = access
const { address } = useWallet()
const tx = useWhitelistTx()

const filter = ref<AdminFilter>('active')
const offset = ref(0)
const admins = ref<IndexerAdmin[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchAdmins() {
  loading.value = true
  error.value = null
  const active = filter.value === 'all' ? undefined : filter.value === 'active'
  try {
    let page = await indexer.getAdmins({ active }, { first: PAGE_SIZE, offset: offset.value })
    // If removals emptied the current page, fall back to the first one.
    if (offset.value > 0 && offset.value >= page.totalCount) {
      offset.value = 0
      page = await indexer.getAdmins({ active }, { first: PAGE_SIZE, offset: 0 })
    }
    admins.value = page.nodes
    total.value = page.totalCount
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function setFilter(next: AdminFilter) {
  if (filter.value === next) return
  filter.value = next
  offset.value = 0
  void fetchAdmins()
}

function onPage(next: number) {
  offset.value = next
  void fetchAdmins()
}

// The indexer trails the chain by a few seconds — coalesce post-tx reloads
// into one delayed refetch of the table plus the shared access state.
let refetchTimer: ReturnType<typeof setTimeout> | undefined

function scheduleRefetch() {
  clearTimeout(refetchTimer)
  refetchTimer = setTimeout(() => {
    void fetchAdmins()
    void access.refresh()
  }, 3000)
}

onMounted(() => {
  void access.refresh()
  void fetchAdmins()
})

onBeforeUnmount(() => clearTimeout(refetchTimer))

const authorityShort = computed(() =>
  config.value ? truncateAddress(config.value.authority, 6) : '…',
)

const emptyCopy = computed(() => {
  if (filter.value === 'removed') {
    return { title: 'No removed admins', hint: 'Admins removed by the authority appear here.' }
  }
  if (filter.value === 'all') {
    return { title: 'No admins yet', hint: 'Admins added by the sudo authority appear here.' }
  }
  return { title: 'No active admins', hint: 'Admins added by the sudo authority appear here.' }
})

// Add admin modal
const addOpen = ref(false)
const addAddress = ref('')
const addLoading = ref(false)
const addError = ref<string | null>(null)

function openAdd() {
  addAddress.value = ''
  addError.value = null
  addOpen.value = true
}

function closeAdd() {
  if (addLoading.value) return
  addOpen.value = false
}

async function submitAdd() {
  const target = addAddress.value.trim()
  if (!target) {
    addError.value = 'Enter an admin address'
    return
  }
  addLoading.value = true
  addError.value = null
  try {
    await tx.addAdmin(target)
    addOpen.value = false
    void access.refresh()
    scheduleRefetch()
  } catch (e) {
    // Already toasted by useWhitelistTx — mirror the message inline in the form.
    addError.value = e instanceof Error ? e.message : String(e)
  } finally {
    addLoading.value = false
  }
}

// Remove admin confirm modal
const removeTarget = ref<IndexerAdmin | null>(null)
const removeLoading = ref(false)

function askRemove(row: IndexerAdmin) {
  removeTarget.value = row
}

function closeRemove() {
  if (removeLoading.value) return
  removeTarget.value = null
}

async function confirmRemove() {
  const target = removeTarget.value
  if (!target) return
  removeLoading.value = true
  try {
    await tx.removeAdmin(target.id)
    removeTarget.value = null
    void access.refresh()
    scheduleRefetch()
  } catch {
    // Already toasted by useWhitelistTx.
  } finally {
    removeLoading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- Header -->
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div class="max-w-xl">
        <p class="text-sm text-ink-muted">
          Whitelist admins can assign roles and set compliance; only the sudo authority manages
          admins
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span class="text-ink-muted">Current authority:</span>
          <UiAddress v-if="config" :address="config.authority" link />
          <UiSpinner v-else :size="14" class="text-ink-muted" />
          <NuxtLink
            to="/authority"
            class="font-bold text-primary transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Manage authority →
          </NuxtLink>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1">
        <UiButton :disabled="!isAuthority" @click="openAdd">Add admin</UiButton>
        <p v-if="!isAuthority" class="text-xs text-ink-muted">
          Only the sudo authority ({{ authorityShort }}) can add admins
        </p>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="mb-3 flex gap-2" role="group" aria-label="Filter admins">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        :aria-pressed="filter === f.key"
        class="inline-flex h-9 items-center rounded-full border-2 px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        :class="
          filter === f.key
            ? 'border-primary bg-primary text-white'
            : 'border-line text-ink-muted hover:border-primary hover:text-primary'
        "
        @click="setFilter(f.key)"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Admins table -->
    <UiCard :padded="false">
      <div v-if="loading" class="flex items-center justify-center py-16 text-primary">
        <UiSpinner :size="28" />
      </div>

      <UiEmptyState v-else-if="error" title="Couldn't load admins" :hint="error">
        <template #icon>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </template>
        <UiButton variant="secondary" class="mt-3" @click="fetchAdmins">Retry</UiButton>
      </UiEmptyState>

      <UiEmptyState v-else-if="admins.length === 0" :title="emptyCopy.title" :hint="emptyCopy.hint">
        <template #icon>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </template>
      </UiEmptyState>

      <template v-else>
        <UiTable>
          <template #thead>
            <tr>
              <th>Admin</th>
              <th>Added by</th>
              <th>Added</th>
              <th>Status</th>
              <th>Removed</th>
              <th class="text-right">Actions</th>
            </tr>
          </template>
          <template #tbody>
            <tr v-for="row in admins" :key="row.id">
              <td>
                <div class="flex flex-wrap items-center gap-1.5">
                  <UiAddress :address="row.id" link />
                  <UiBadge v-if="row.id === address" tone="cyan">you</UiBadge>
                  <UiBadge v-if="config && row.id === config.authority" tone="info">
                    authority
                  </UiBadge>
                </div>
              </td>
              <td>
                <UiAddress :address="row.addedBy" />
              </td>
              <td>
                <span class="text-ink-muted" :title="formatDateTime(row.addedAt)">
                  {{ timeAgo(row.addedAt) }}
                </span>
              </td>
              <td>
                <UiBadge :tone="row.active ? 'success' : 'error'">
                  {{ row.active ? 'Active' : 'Removed' }}
                </UiBadge>
              </td>
              <td>
                <span
                  v-if="row.removedAt"
                  class="text-ink-muted"
                  :title="formatDateTime(row.removedAt)"
                >
                  {{ timeAgo(row.removedAt) }}
                </span>
                <span v-else class="text-ink-faint">—</span>
              </td>
              <td class="text-right">
                <button
                  v-if="isAuthority && row.active"
                  type="button"
                  class="inline-flex h-8 items-center rounded-full border-2 border-negative px-3 text-xs font-bold text-negative transition hover:bg-negative/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-negative"
                  @click="askRemove(row)"
                >
                  Remove
                </button>
                <span v-else class="text-xs text-ink-faint">—</span>
              </td>
            </tr>
          </template>
        </UiTable>
        <div v-if="total > PAGE_SIZE" class="border-t border-line/50 px-3 py-3">
          <UiPagination :total="total" :first="PAGE_SIZE" :offset="offset" @update="onPage" />
        </div>
      </template>
    </UiCard>

    <!-- Add admin modal -->
    <UiModal :open="addOpen" @close="closeAdd">
      <template #title>Add admin</template>
      <form class="flex flex-col gap-4" @submit.prevent="submitAdd">
        <UiInput
          v-model="addAddress"
          label="Admin address"
          placeholder="Base58 address…"
          :error="addError ?? undefined"
          :disabled="addLoading"
        />
        <div class="flex justify-end gap-2">
          <UiButton variant="ghost" :disabled="addLoading" @click="closeAdd">Cancel</UiButton>
          <UiButton type="submit" :loading="addLoading">Add admin</UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Remove admin confirm modal -->
    <UiModal :open="removeTarget !== null" @close="closeRemove">
      <template #title>Remove admin</template>
      <p v-if="removeTarget" class="text-sm text-ink-muted">
        Removing
        <UiAddress :address="removeTarget.id" :chars="6" class="text-ink" />
        refunds its account rent to the authority
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <UiButton variant="ghost" :disabled="removeLoading" @click="closeRemove">Cancel</UiButton>
        <UiButton variant="danger" :loading="removeLoading" @click="confirmRemove">
          Remove admin
        </UiButton>
      </div>
    </UiModal>
  </div>
</template>
