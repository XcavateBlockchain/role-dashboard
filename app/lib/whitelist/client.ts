import { AnchorProvider, Program, type Idl } from '@anchor-lang/core'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import type { TransactionInstruction, VersionedTransaction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { getSolanaConnection } from '~/lib/solana/connection'
import idl from '~/lib/whitelist/idl.json'
import {
  ADMIN_SEED,
  CONFIG_SEED,
  PERMISSIONS,
  ROLE_SEED,
  WHITELIST_PROGRAM_ID,
  roleByIndex,
} from '~/lib/whitelist/constants'

const PROGRAM_ID = new PublicKey(WHITELIST_PROGRAM_ID)
const BPF_LOADER_UPGRADEABLE_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')

/** Thin adapter over a connected Wallet Standard account, for AnchorProvider. */
export interface WhitelistWallet {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
}

/** Program client bound to the shared `/api/rpc` connection. */
export function getWhitelistProgram(wallet: WhitelistWallet): Program {
  const provider = new AnchorProvider(getSolanaConnection(), wallet, {
    commitment: 'confirmed',
  })
  return new Program(idl as unknown as Idl, provider)
}

// Tx builders only build instructions — signing/sending goes through
// useWallet().sendTransaction — so they use a build-only provider wallet
// cached per fee payer.
const programCache = new Map<string, Program>()

function getProgramForPayer(payer: PublicKey): Program {
  const key = payer.toBase58()
  let program = programCache.get(key)
  if (!program) {
    program = getWhitelistProgram({
      publicKey: payer,
      signTransaction: <T extends Transaction | VersionedTransaction>(_tx: T): Promise<T> =>
        Promise.reject(new Error('Program instance is build-only')),
      signAllTransactions: <T extends Transaction | VersionedTransaction>(
        _txs: T[],
      ): Promise<T[]> => Promise.reject(new Error('Program instance is build-only')),
    })
    programCache.set(key, program)
  }
  return program
}

export function findConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID)
}

export function findAdminPda(adminKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ADMIN_SEED), adminKey.toBuffer()],
    PROGRAM_ID,
  )
}

export function findRolePda(userKey: PublicKey, roleIndex: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ROLE_SEED), userKey.toBuffer(), Uint8Array.from([roleIndex])],
    PROGRAM_ID,
  )
}

function roleArg(roleIndex: number): Record<string, Record<string, never>> {
  const role = roleByIndex(roleIndex)
  if (!role) throw new Error(`Unknown role index: ${roleIndex}`)
  return { [role.idl]: {} }
}

function permissionArg(permissionIndex: number): Record<string, Record<string, never>> {
  const permission = PERMISSIONS.find((p) => p.index === permissionIndex)
  if (!permission) throw new Error(`Unknown permission index: ${permissionIndex}`)
  return { [permission.idl]: {} }
}

// Account metas follow the IDL writable flags. NOTE: the deployed devnet
// binary has been observed to require non-signer accounts to be writable — if
// simulation throws PrivilegeEscalation, flip this flag to force the metas.
const FORCE_NON_SIGNER_WRITABLE = false

// The generic `Program<Idl>` methods namespace is loosely typed; this is the
// slice of the MethodsBuilder API the tx builders use.
interface MethodsNamespaceLoose {
  [name: string]:
    | ((...args: unknown[]) => {
        accountsPartial(accounts: Record<string, PublicKey>): {
          instruction(): Promise<TransactionInstruction>
        }
      })
    | undefined
}

async function buildTx(
  program: Program,
  name: string,
  args: unknown[],
  accounts: Record<string, PublicKey>,
): Promise<Transaction> {
  const method = (program.methods as unknown as MethodsNamespaceLoose)[name]
  if (!method) throw new Error(`Unknown instruction: ${name}`)
  const ix = await method(...args).accountsPartial(accounts).instruction()
  if (FORCE_NON_SIGNER_WRITABLE) {
    for (const meta of ix.keys) {
      if (!meta.isSigner) meta.isWritable = true
    }
  }
  return new Transaction().add(ix)
}

export interface AssignRoleArgs {
  adminSigner: PublicKey
  user: PublicKey
  roleIndex: number
}

export function buildAssignRoleTx({ adminSigner, user, roleIndex }: AssignRoleArgs) {
  const [admin] = findAdminPda(adminSigner)
  const [roleAccount] = findRolePda(user, roleIndex)
  return buildTx(getProgramForPayer(adminSigner), 'assignRole', [roleArg(roleIndex)], {
    adminSigner,
    admin,
    user,
    roleAccount,
    systemProgram: SystemProgram.programId,
  })
}

export interface RemoveRoleArgs {
  adminSigner: PublicKey
  user: PublicKey
  roleIndex: number
  rentPayer: PublicKey
}

export function buildRemoveRoleTx({ adminSigner, user, roleIndex, rentPayer }: RemoveRoleArgs) {
  const [admin] = findAdminPda(adminSigner)
  const [roleAccount] = findRolePda(user, roleIndex)
  return buildTx(getProgramForPayer(adminSigner), 'removeRole', [roleArg(roleIndex)], {
    adminSigner,
    admin,
    user,
    rentPayer,
    roleAccount,
  })
}

export interface RenounceRoleArgs {
  user: PublicKey
  roleIndex: number
  rentPayer: PublicKey
}

export function buildRenounceRoleTx({ user, roleIndex, rentPayer }: RenounceRoleArgs) {
  const [roleAccount] = findRolePda(user, roleIndex)
  return buildTx(getProgramForPayer(user), 'renounceRole', [roleArg(roleIndex)], {
    user,
    rentPayer,
    roleAccount,
  })
}

export interface SetPermissionArgs {
  adminSigner: PublicKey
  user: PublicKey
  roleIndex: number
  permissionIndex: number
}

export function buildSetPermissionTx({
  adminSigner,
  user,
  roleIndex,
  permissionIndex,
}: SetPermissionArgs) {
  const [admin] = findAdminPda(adminSigner)
  const [roleAccount] = findRolePda(user, roleIndex)
  return buildTx(
    getProgramForPayer(adminSigner),
    'setPermission',
    [roleArg(roleIndex), permissionArg(permissionIndex)],
    {
      adminSigner,
      admin,
      user,
      roleAccount,
    },
  )
}

export interface AddAdminArgs {
  authority: PublicKey
  newAdmin: PublicKey
}

export function buildAddAdminTx({ authority, newAdmin }: AddAdminArgs) {
  const [config] = findConfigPda()
  const [admin] = findAdminPda(newAdmin)
  return buildTx(getProgramForPayer(authority), 'addAdmin', [], {
    authority,
    config,
    newAdmin,
    admin,
    systemProgram: SystemProgram.programId,
  })
}

export interface RemoveAdminArgs {
  authority: PublicKey
  adminKey: PublicKey
}

export function buildRemoveAdminTx({ authority, adminKey }: RemoveAdminArgs) {
  const [config] = findConfigPda()
  const [admin] = findAdminPda(adminKey)
  return buildTx(getProgramForPayer(authority), 'removeAdmin', [adminKey], {
    authority,
    config,
    admin,
  })
}

export interface UpdateAuthorityArgs {
  authority: PublicKey
  newAuthority: PublicKey
}

export function buildUpdateAuthorityTx({ authority, newAuthority }: UpdateAuthorityArgs) {
  const [config] = findConfigPda()
  return buildTx(getProgramForPayer(authority), 'updateAuthority', [newAuthority], {
    authority,
    config,
  })
}

export interface AcceptAuthorityArgs {
  newAuthority: PublicKey
}

export function buildAcceptAuthorityTx({ newAuthority }: AcceptAuthorityArgs) {
  const [config] = findConfigPda()
  return buildTx(getProgramForPayer(newAuthority), 'acceptAuthority', [], {
    newAuthority,
    config,
  })
}

export interface InitializeConfigArgs {
  authority: PublicKey
}

export function buildInitializeConfigTx({ authority }: InitializeConfigArgs) {
  const [config] = findConfigPda()
  const [programData] = PublicKey.findProgramAddressSync(
    [PROGRAM_ID.toBuffer()],
    BPF_LOADER_UPGRADEABLE_ID,
  )
  return buildTx(getProgramForPayer(authority), 'initializeConfig', [], {
    authority,
    program: PROGRAM_ID,
    programData,
    config,
    systemProgram: SystemProgram.programId,
  })
}
