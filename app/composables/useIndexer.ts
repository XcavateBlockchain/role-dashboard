import type {
  AccessCheck,
  Connection,
  IndexerAdmin,
  IndexerConfig,
  PageArgs,
  ProgramUpgrade,
  RoleAssignment,
  SyncStatus,
  WhitelistAction,
} from '~/lib/indexer/types'
import {
  ADMINS,
  CHECK_ACCESS,
  CONFIG,
  PROGRAM_UPGRADES,
  ROLE_ASSIGNMENT,
  ROLE_ASSIGNMENTS,
  SYNC_STATUS,
  WHITELIST_ACTIONS,
} from '~/lib/indexer/queries'

/** Server-side guard limits the client mirrors (the indexer also clamps silently). */
const MAX_FIRST = 100
const DEFAULT_PAGE: Required<PageArgs> = { first: 20, offset: 0 }

/** I64 fields per row type — the only fields normalized from string to number. */
const I64_FIELDS = {
  config: ['updatedAtSlot'],
  admin: ['addedAtSlot', 'removedAtSlot'],
  assignment: ['assignedAtSlot', 'updatedAtSlot', 'removedAtSlot'],
  action: ['slot'],
  sync: ['lastContiguousSlot', 'snapshotSlot', 'chainTipSlot', 'slotLag'],
  programSync: ['lastContiguousSlot', 'backfillFloorSlot', 'snapshotSlot'],
  upgrade: ['upgradeSlot'],
} as const

interface GqlResponse<T> {
  data?: T | null
  errors?: { message: string }[]
}

async function gql<T>(doc: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await $fetch<GqlResponse<T>>('/api/graphql', {
    method: 'POST',
    body: { query: doc, variables },
  })
  if (res.errors?.length) {
    throw new Error(res.errors[0]?.message ?? 'Indexer query failed')
  }
  if (res.data == null) {
    throw new Error('Indexer returned no data')
  }
  return res.data
}

/** The indexer's I64 scalar arrives as a JSON string; convert whitelisted fields (null stays null). */
function normalizeI64<T>(node: T, fields: readonly string[]): T {
  const out = { ...(node as Record<string, unknown>) }
  for (const field of fields) {
    const value = out[field]
    if (typeof value === 'string') out[field] = Number(value)
  }
  return out as T
}

function pageVars(page: PageArgs = {}): Required<PageArgs> {
  return {
    first: Math.min(Math.max(page.first ?? DEFAULT_PAGE.first, 0), MAX_FIRST),
    offset: Math.max(page.offset ?? DEFAULT_PAGE.offset, 0),
  }
}

/** Typed reads against the indexer GraphQL API (proxied at /api/graphql). */
export function useIndexer() {
  async function getConfig(): Promise<IndexerConfig | null> {
    const data = await gql<{ config: IndexerConfig | null }>(CONFIG)
    return data.config ? normalizeI64(data.config, I64_FIELDS.config) : null
  }

  async function getAdmins(
    filter: { active?: boolean } = {},
    page?: PageArgs,
  ): Promise<Connection<IndexerAdmin>> {
    const data = await gql<{ admins: Connection<IndexerAdmin> }>(ADMINS, {
      active: filter.active,
      ...pageVars(page),
    })
    return {
      totalCount: data.admins.totalCount,
      nodes: data.admins.nodes.map((node) => normalizeI64(node, I64_FIELDS.admin)),
    }
  }

  async function getRoleAssignment(
    user: string,
    roleGql: string,
  ): Promise<RoleAssignment | null> {
    const data = await gql<{ roleAssignment: RoleAssignment | null }>(ROLE_ASSIGNMENT, {
      user,
      role: roleGql,
    })
    return data.roleAssignment
      ? normalizeI64(data.roleAssignment, I64_FIELDS.assignment)
      : null
  }

  async function getRoleAssignments(
    filter: {
      user?: string
      role?: string
      permission?: 'COMPLIANT' | 'REVOKED'
      active?: boolean
    } = {},
    page?: PageArgs,
  ): Promise<Connection<RoleAssignment>> {
    const data = await gql<{ roleAssignments: Connection<RoleAssignment> }>(
      ROLE_ASSIGNMENTS,
      {
        user: filter.user,
        role: filter.role,
        permission: filter.permission,
        active: filter.active,
        ...pageVars(page),
      },
    )
    return {
      totalCount: data.roleAssignments.totalCount,
      nodes: data.roleAssignments.nodes.map((node) =>
        normalizeI64(node, I64_FIELDS.assignment),
      ),
    }
  }

  async function getWhitelistActions(
    filter: {
      subject?: string
      actor?: string
      type?: string
      txSignature?: string
    } = {},
    page?: PageArgs,
  ): Promise<Connection<WhitelistAction>> {
    const data = await gql<{ whitelistActions: Connection<WhitelistAction> }>(
      WHITELIST_ACTIONS,
      {
        subject: filter.subject,
        actor: filter.actor,
        type: filter.type,
        txSignature: filter.txSignature,
        ...pageVars(page),
      },
    )
    return {
      totalCount: data.whitelistActions.totalCount,
      nodes: data.whitelistActions.nodes.map((node) => normalizeI64(node, I64_FIELDS.action)),
    }
  }

  async function checkAccess(user: string, roleGql: string): Promise<AccessCheck> {
    const data = await gql<{ checkAccess: AccessCheck }>(CHECK_ACCESS, {
      user,
      role: roleGql,
    })
    return data.checkAccess
  }

  async function getSyncStatus(): Promise<SyncStatus> {
    const data = await gql<{ syncStatus: SyncStatus }>(SYNC_STATUS)
    const status = normalizeI64(data.syncStatus, I64_FIELDS.sync)
    return {
      ...status,
      programs: status.programs.map((program) =>
        normalizeI64(program, I64_FIELDS.programSync),
      ),
    }
  }

  async function getProgramUpgrades(): Promise<ProgramUpgrade[]> {
    const data = await gql<{ programUpgrades: ProgramUpgrade[] }>(PROGRAM_UPGRADES)
    return data.programUpgrades.map((upgrade) => normalizeI64(upgrade, I64_FIELDS.upgrade))
  }

  return {
    getConfig,
    getAdmins,
    getRoleAssignment,
    getRoleAssignments,
    getWhitelistActions,
    checkAccess,
    getSyncStatus,
    getProgramUpgrades,
  }
}
