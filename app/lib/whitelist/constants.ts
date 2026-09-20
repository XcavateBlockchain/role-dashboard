/**
 * Single source of truth for the xcavate-whitelist program surface.
 *
 * Mirrors programs/xcavate-whitelist/src/{state,constants,error}.rs from
 * realxmarket-solana and the indexer GraphQL enums. The on-chain Role and
 * AccessPermission variant indices are serialized into account data and the
 * role index is a PDA seed byte — never reorder these lists.
 */

export const WHITELIST_PROGRAM_ID = '7TrzjKpdrEhnfhxuw8tWdH1sjxadazscsG5HXCDPLmaY'

/** PDA seed prefixes (programs/xcavate-whitelist/src/constants.rs). */
export const CONFIG_SEED = 'config'
export const ADMIN_SEED = 'admin'
export const ROLE_SEED = 'role'

export interface RoleMeta {
  /** Serialized variant index; also the PDA seed byte. */
  index: number
  /** Anchor IDL enum variant key (camelCase object key). */
  idl: string
  /** Indexer GraphQL enum value. */
  gql: string
  label: string
  description: string
}

export const ROLES: readonly RoleMeta[] = [
  {
    index: 0,
    idl: 'regionalOperator',
    gql: 'REGIONAL_OPERATOR',
    label: 'Regional Operator',
    description:
      'Manages a region: claims the operator seat, registers locations, sets listing duration and tax.',
  },
  {
    index: 1,
    idl: 'realEstateInvestor',
    gql: 'REAL_ESTATE_INVESTOR',
    label: 'Real Estate Investor',
    description: 'Buys, claims, relists and votes on fractional property shares.',
  },
  {
    index: 2,
    idl: 'realEstateDeveloper',
    gql: 'REAL_ESTATE_DEVELOPER',
    label: 'Real Estate Developer',
    description: 'Lists properties for fractional sale.',
  },
  {
    index: 3,
    idl: 'lawyer',
    gql: 'LAWYER',
    label: 'Lawyer',
    description: "Represents the developer or SPV side of a property sale's legal process.",
  },
  {
    index: 4,
    idl: 'lettingAgent',
    gql: 'LETTING_AGENT',
    label: 'Letting Agent',
    description: 'Manages let properties and distributes rental income to share holders.',
  },
  {
    index: 5,
    idl: 'spvConfirmation',
    gql: 'SPV_CONFIRMATION',
    label: 'SPV Confirmation',
    description: 'Confirms that the SPV for a sold-out property has been created.',
  },
] as const

export interface PermissionMeta {
  index: number
  idl: string
  gql: 'COMPLIANT' | 'REVOKED'
  label: string
}

export const PERMISSIONS: readonly PermissionMeta[] = [
  { index: 0, idl: 'compliant', gql: 'COMPLIANT', label: 'Compliant' },
  { index: 1, idl: 'revoked', gql: 'REVOKED', label: 'Revoked' },
] as const

export type PermissionGql = (typeof PERMISSIONS)[number]['gql']

export function roleByIndex(index: number): RoleMeta | undefined {
  return ROLES.find((r) => r.index === index)
}

export function roleByGql(gql: string): RoleMeta | undefined {
  return ROLES.find((r) => r.gql === gql)
}

export function roleLabel(gqlOrIdl: string): string {
  return (
    ROLES.find((r) => r.gql === gqlOrIdl || r.idl === gqlOrIdl)?.label ?? gqlOrIdl
  )
}

/** Indexer WhitelistAction.actionType values with display labels. */
export const ACTION_TYPES = [
  { gql: 'CONFIG_INITIALIZED', label: 'Config initialized' },
  { gql: 'AUTHORITY_UPDATE_PROPOSED', label: 'Authority update proposed' },
  { gql: 'AUTHORITY_UPDATED', label: 'Authority updated' },
  { gql: 'ADMIN_ADDED', label: 'Admin added' },
  { gql: 'ADMIN_REMOVED', label: 'Admin removed' },
  { gql: 'ROLE_ASSIGNED', label: 'Role assigned' },
  { gql: 'ROLE_REMOVED', label: 'Role removed' },
  { gql: 'ROLE_RENOUNCED', label: 'Role renounced' },
  { gql: 'PERMISSION_UPDATED', label: 'Permission updated' },
] as const

export function actionLabel(gql: string): string {
  return ACTION_TYPES.find((a) => a.gql === gql)?.label ?? gql
}

/** WhitelistError codes → messages (programs/xcavate-whitelist/src/error.rs). */
export const WHITELIST_ERRORS: Record<number, string> = {
  6000: 'Signer is not the sudo authority',
  6001: 'Permission is already set to this value',
  6002: 'Invalid authority address',
  6003: 'Signer is not the program upgrade authority',
  6004: 'Signer is not the pending authority',
  6005: 'Wrong rent payer',
}
