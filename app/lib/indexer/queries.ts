/**
 * GraphQL documents for the realXmarket indexer API. Selection sets mirror the
 * full row types in ./types.ts and sit well inside the server guards
 * (query ≤ 20KB, depth ≤ 8, ≤ 500 selected fields).
 */

export const CONFIG = /* GraphQL */ `
  query Config {
    config {
      id
      authority
      pendingAuthority
      updatedAtSlot
      updatedAt
      updatedInTx
    }
  }
`

export const ADMINS = /* GraphQL */ `
  query Admins($active: Boolean, $first: Int, $offset: Int) {
    admins(active: $active, first: $first, offset: $offset) {
      nodes {
        id
        active
        addedBy
        addedAtSlot
        addedAt
        addedInTx
        removedAtSlot
        removedAt
        removedInTx
      }
      totalCount
    }
  }
`

export const ROLE_ASSIGNMENT = /* GraphQL */ `
  query RoleAssignment($user: String!, $role: Role!) {
    roleAssignment(user: $user, role: $role) {
      id
      user
      role
      permission
      active
      rentPayer
      assignedBy
      assignedAtSlot
      assignedAt
      assignedInTx
      updatedAtSlot
      updatedAt
      removedAtSlot
      removedAt
      removedInTx
      removalKind
      removedBy
    }
  }
`

export const ROLE_ASSIGNMENTS = /* GraphQL */ `
  query RoleAssignments(
    $user: String
    $role: Role
    $permission: Permission
    $active: Boolean
    $first: Int
    $offset: Int
  ) {
    roleAssignments(
      user: $user
      role: $role
      permission: $permission
      active: $active
      first: $first
      offset: $offset
    ) {
      nodes {
        id
        user
        role
        permission
        active
        rentPayer
        assignedBy
        assignedAtSlot
        assignedAt
        assignedInTx
        updatedAtSlot
        updatedAt
        removedAtSlot
        removedAt
        removedInTx
        removalKind
        removedBy
      }
      totalCount
    }
  }
`

export const WHITELIST_ACTIONS = /* GraphQL */ `
  query WhitelistActions(
    $subject: String
    $actor: String
    $type: ActionType
    $txSignature: String
    $first: Int
    $offset: Int
  ) {
    whitelistActions(
      subject: $subject
      actor: $actor
      type: $type
      txSignature: $txSignature
      first: $first
      offset: $offset
    ) {
      nodes {
        id
        type
        subject
        role
        permission
        actor
        slot
        blockTime
        txSignature
        instructionIndex
      }
      totalCount
    }
  }
`

export const CHECK_ACCESS = /* GraphQL */ `
  query CheckAccess($user: String!, $role: Role!) {
    checkAccess(user: $user, role: $role) {
      hasRole
      compliant
    }
  }
`

export const SYNC_STATUS = /* GraphQL */ `
  query SyncStatus {
    syncStatus {
      lastContiguousSlot
      backfillComplete
      snapshotSlot
      chainTipSlot
      slotLag
      programs {
        program
        lastContiguousSlot
        backfillComplete
        backfillFloorSlot
        snapshotSlot
      }
    }
  }
`

export const PROGRAM_UPGRADES = /* GraphQL */ `
  query ProgramUpgrades {
    programUpgrades(program: XCAVATE_WHITELIST) {
      program
      upgradeSlot
      signature
      source
      detectedAt
    }
  }
`
