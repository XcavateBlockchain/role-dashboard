import type { PermissionGql } from '~/lib/whitelist/constants'

/**
 * Row types of the realXmarket indexer GraphQL API (crates/api/src/graphql).
 * camelCase fields; enums cross the wire as SCREAMING_SNAKE_CASE strings;
 * DateTime is an RFC3339 string. The custom I64 scalar arrives as a JSON
 * string — every interface here already reflects useIndexer's normalized
 * shape (I64 fields as `number`).
 */

export interface IndexerConfig {
  /** Singleton row id ("config"). */
  id: string
  authority: string
  pendingAuthority: string | null
  updatedAtSlot: number
  updatedAt: string
  updatedInTx: string
}

export interface IndexerAdmin {
  /** Admin address (base58). */
  id: string
  active: boolean
  addedBy: string
  addedAtSlot: number
  addedAt: string
  addedInTx: string
  removedAtSlot: number | null
  removedAt: string | null
  removedInTx: string | null
}

export interface RoleAssignment {
  id: string
  user: string
  /** Role enum value, e.g. REGIONAL_OPERATOR. */
  role: string
  permission: PermissionGql
  active: boolean
  rentPayer: string
  assignedBy: string
  assignedAtSlot: number
  assignedAt: string
  assignedInTx: string
  updatedAtSlot: number
  updatedAt: string
  removedAtSlot: number | null
  removedAt: string | null
  removedInTx: string | null
  removalKind: 'REMOVED' | 'RENOUNCED' | null
  removedBy: string | null
}

export interface WhitelistAction {
  id: string
  /** ActionType enum value, e.g. ROLE_ASSIGNED. */
  type: string
  subject: string | null
  role: string | null
  permission: string | null
  actor: string
  slot: number
  blockTime: string
  txSignature: string
  /** Ix index within the tx ("0", or "0.1" for an inner ix) — a plain string, not I64. */
  instructionIndex: string
}

export interface AccessCheck {
  hasRole: boolean
  compliant: boolean
}

export interface ProgramSyncStatus {
  /** ProgramName enum value, e.g. XCAVATE_WHITELIST. */
  program: string
  lastContiguousSlot: number
  backfillComplete: boolean
  backfillFloorSlot: number
  snapshotSlot: number | null
}

export interface SyncStatus {
  lastContiguousSlot: number
  backfillComplete: boolean
  snapshotSlot: number | null
  chainTipSlot: number
  slotLag: number
  programs: ProgramSyncStatus[]
}

export interface ProgramUpgrade {
  /** ProgramName enum value, e.g. XCAVATE_WHITELIST. */
  program: string
  upgradeSlot: number
  signature: string | null
  /** "deploy" (seeded initial row) or "chain" (observed upgrade). */
  source: string
  detectedAt: string
}

export interface PageArgs {
  first?: number
  offset?: number
}

export interface Connection<T> {
  nodes: T[]
  totalCount: number
}
