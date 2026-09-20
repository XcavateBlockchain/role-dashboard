<script setup lang="ts">
import { ROLES, roleByGql, roleLabel } from '~/lib/whitelist/constants'
import type { RoleAssignment } from '~/lib/indexer/types'

const PAGE_SIZE = 20

const indexer = useIndexer()
const { isAdmin, refresh: refreshAccess } = useWhitelistAccess()
const { address } = useWallet()
const tx = useWhitelistTx()

useHead({ title: 'Roles' })

// Draft filter inputs (applied on Apply).
const draftUser = ref('')
const draftRole = ref('')
const draftPermission = ref('')
const draftStatus = ref<'active' | 'removed' | 'all'>('active')

interface AppliedFilters {
  user?: string
  role?: string
  permission?: 'COMPLIANT' | 'REVOKED'
  active?: boolean
}

const applied = ref<AppliedFilters>({ active: true })
const offset = ref(0)

const rows = ref<RoleAssignment[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')

async function fetchAssignments() {
  loading.value = true
  loadError.value = ''
  try {
    const page = await indexer.getRoleAssignments(applied.value, {
      first: PAGE_SIZE,
      offset: offset.value,
    })
    rows.value = page.nodes
    total.value = page.totalCount
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  applied.value = {
    user: draftUser.value.trim() || undefined,
    role: draftRole.value || undefined,
    permission: (draftPermission.value || undefined) as AppliedFilters['permission'],
    active:
      draftStatus.value === 'all' ? undefined : draftStatus.value === 'active',
  }
  offset.value = 0
  void fetchAssignments()
}

function clearFilters() {
  draftUser.value = ''
  draftRole.value = ''
  draftPermission.value = ''
  draftStatus.value = 'active'
  applyFilters()
}

function onPage(newOffset: number) {
  offset.value = newOffset
  void fetchAssignments()
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Indexer trails the chain by a few seconds — one delayed refetch after each tx.
let refreshTimer: ReturnType<typeof setTimeout> | undefined
function scheduleRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void fetchAssignments()
    void refreshAccess()
  }, 3000)
}

onMounted(() => {
  void refreshAccess()
  void fetchAssignments()
})
onBeforeUnmount(() => clearTimeout(refreshTimer))

// --- Write actions ---

const assignOpen = ref(false)
const busyRowId = ref<string | null>(null)

function rowRoleIndex(row: RoleAssignment): number | null {
  return roleByGql(row.role)?.index ?? null
}

const adminHint = 'Connect with an admin wallet'

async function setCompliant(row: RoleAssignment) {
  const roleIndex = rowRoleIndex(row)
  if (roleIndex === null) return
  busyRowId.value = row.id
  try {
    await tx.setPermission(row.user, roleIndex, 0)
    scheduleRefresh()
  } catch {
    // Failure already toasted by useWhitelistTx.
  } finally {
    busyRowId.value = null
  }
}

type ConfirmKind = 'revoke' | 'remove' | 'renounce'
const confirmState = ref<{ kind: ConfirmKind; row: RoleAssignment } | null>(null)
const confirmLoading = ref(false)

const confirmCopy = computed(() => {
  const state = confirmState.value
  if (!state) return null
  const label = roleLabel(state.row.role)
  if (state.kind === 'revoke') {
    return {
      title: 'Revoke access',
      confirmLabel: 'Revoke access',
      message: `Sets the ${label} permission for this user to revoked. The role stays assigned, but the user is no longer compliant.`,
    }
  }
  if (state.kind === 'remove') {
    return {
      title: 'Remove role',
      confirmLabel: 'Remove role',
      message: `Removes the ${label} role from this user and closes the role account. The rent deposit returns to the rent payer.`,
    }
  }
  return {
    title: 'Renounce role',
    confirmLabel: 'Renounce role',
    message: `Removes your own ${label} role and closes the role account. The rent deposit returns to the rent payer.`,
  }
})

async function runConfirm() {
  const state = confirmState.value
  if (!state) return
  const roleIndex = rowRoleIndex(state.row)
  if (roleIndex === null) return
  confirmLoading.value = true
  try {
    if (state.kind === 'revoke') {
      await tx.setPermission(state.row.user, roleIndex, 1)
    } else if (state.kind === 'remove') {
      await tx.removeRole(state.row.user, roleIndex, state.row.rentPayer)
    } else {
      await tx.renounceRole(roleIndex, state.row.rentPayer)
    }
    confirmState.value = null
    scheduleRefresh()
  } catch {
    // Failure already toasted by useWhitelistTx.
  } finally {
    confirmLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <p class="max-w-2xl text-sm text-ink-muted">
        Whitelist role assignments on the xcavate-whitelist program. Admins assign roles,
        manage compliance and remove roles; role holders can renounce their own.
      </p>
      <span :title="isAdmin ? undefined : adminHint">
        <UiButton :disabled="!isAdmin" @click="assignOpen = true">Assign role</UiButton>
      </span>
    </div>

    <!-- Filter bar -->
    <UiCard>
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
          <UiInput
            v-model="draftUser"
            label="User address"
            placeholder="Filter by user"
            @keyup.enter="applyFilters"
          />
        </div>
        <div class="w-full sm:w-52">
          <UiSelect v-model="draftRole" label="Role">
            <option value="">All</option>
            <option v-for="role in ROLES" :key="role.gql" :value="role.gql">
              {{ role.label }}
            </option>
          </UiSelect>
        </div>
        <div class="w-full sm:w-40">
          <UiSelect v-model="draftPermission" label="Compliance">
            <option value="">All</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="REVOKED">Revoked</option>
          </UiSelect>
        </div>
        <div class="w-full sm:w-36">
          <UiSelect v-model="draftStatus" label="Status">
            <option value="active">Active</option>
            <option value="removed">Removed</option>
            <option value="all">All</option>
          </UiSelect>
        </div>
        <div class="flex gap-2">
          <UiButton variant="secondary" @click="applyFilters">Apply</UiButton>
          <UiButton variant="secondary" @click="clearFilters">Clear</UiButton>
        </div>
      </div>
    </UiCard>

    <!-- Results -->
    <UiCard>
      <div class="mb-3 flex items-center justify-between gap-2">
        <p class="text-sm font-extrabold">
          Assignments
          <span v-if="!loading && !loadError" class="font-bold text-ink-muted">
            · {{ total }}
          </span>
        </p>
        <UiButton variant="ghost" class="h-9! px-4!" :disabled="loading" @click="fetchAssignments">
          Refresh
        </UiButton>
      </div>

      <div v-if="loading && rows.length === 0" class="flex justify-center py-10 text-primary">
        <UiSpinner :size="28" />
      </div>

      <div v-else-if="loadError" class="flex flex-col items-center gap-3 py-10 text-center">
        <p class="text-sm text-negative">{{ loadError }}</p>
        <UiButton variant="secondary" @click="fetchAssignments">Retry</UiButton>
      </div>

      <UiEmptyState
        v-else-if="rows.length === 0"
        title="No assignments match"
        hint="Adjust the filters or assign a new role."
      >
        <template #icon>
          <NavIcon name="roles" :size="36" />
        </template>
      </UiEmptyState>

      <template v-else>
        <UiTable>
          <template #thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Compliance</th>
              <th>Assigned by</th>
              <th>Assigned</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </template>
          <template #tbody>
            <tr v-for="row in rows" :key="row.id">
              <td><UiAddress :address="row.user" link /></td>
              <td>
                <UiBadge tone="neutral">{{ roleLabel(row.role) }}</UiBadge>
              </td>
              <td>
                <UiBadge :tone="row.permission === 'COMPLIANT' ? 'success' : 'error'">
                  {{ row.permission === 'COMPLIANT' ? 'Compliant' : 'Revoked' }}
                </UiBadge>
              </td>
              <td><UiAddress :address="row.assignedBy" link /></td>
              <td>
                <span class="text-ink-muted" :title="formatDateTime(row.assignedAt)">
                  {{ timeAgo(row.assignedAt) }}
                </span>
              </td>
              <td>
                <UiBadge v-if="row.active" tone="success">Active</UiBadge>
                <UiBadge v-else-if="row.removalKind === 'REMOVED'" tone="error">Removed</UiBadge>
                <UiBadge v-else tone="neutral">Renounced</UiBadge>
              </td>
              <td>
                <div class="flex flex-wrap items-center justify-end gap-1">
                  <!-- Own row: renounce instead of admin actions. -->
                  <template v-if="row.user === address">
                    <UiButton
                      v-if="row.active && rowRoleIndex(row) !== null"
                      variant="ghost"
                      class="h-8! px-3! text-xs!"
                      :loading="busyRowId === row.id"
                      @click="confirmState = { kind: 'renounce', row }"
                    >
                      Renounce
                    </UiButton>
                    <span v-else class="text-xs text-ink-faint">—</span>
                  </template>
                  <template v-else-if="row.active && rowRoleIndex(row) !== null">
                    <span :title="isAdmin ? undefined : adminHint">
                      <UiButton
                        v-if="row.permission === 'REVOKED'"
                        variant="ghost"
                        class="h-8! px-3! text-xs!"
                        :disabled="!isAdmin"
                        :loading="busyRowId === row.id"
                        @click="setCompliant(row)"
                      >
                        Set compliant
                      </UiButton>
                    </span>
                    <span :title="isAdmin ? undefined : adminHint">
                      <UiButton
                        v-if="row.permission === 'COMPLIANT'"
                        variant="danger"
                        class="h-8! px-3! text-xs!"
                        :disabled="!isAdmin"
                        @click="confirmState = { kind: 'revoke', row }"
                      >
                        Revoke access
                      </UiButton>
                    </span>
                    <span :title="isAdmin ? undefined : adminHint">
                      <UiButton
                        variant="danger"
                        class="h-8! px-3! text-xs!"
                        :disabled="!isAdmin"
                        @click="confirmState = { kind: 'remove', row }"
                      >
                        Remove role
                      </UiButton>
                    </span>
                  </template>
                  <span v-else class="text-xs text-ink-faint">—</span>
                </div>
              </td>
            </tr>
          </template>
        </UiTable>

        <div class="mt-3">
          <UiPagination
            :total="total"
            :first="PAGE_SIZE"
            :offset="offset"
            @update="onPage"
          />
        </div>
      </template>
    </UiCard>

    <RolesCheckAccessTool />

    <RolesAssignRoleModal
      :open="assignOpen"
      @close="assignOpen = false"
      @assigned="scheduleRefresh"
    />

    <RolesRoleConfirmModal
      :open="confirmState !== null"
      :confirm-label="confirmCopy?.confirmLabel"
      :loading="confirmLoading"
      @close="confirmState = null"
      @confirm="runConfirm"
    >
      <template #title>{{ confirmCopy?.title }}</template>
      <p>{{ confirmCopy?.message }}</p>
      <p v-if="confirmState" class="mt-2 flex items-center gap-1 text-ink">
        <UiAddress :address="confirmState.row.user" link />
        <UiBadge tone="neutral">{{ roleLabel(confirmState.row.role) }}</UiBadge>
      </p>
    </RolesRoleConfirmModal>
  </div>
</template>
