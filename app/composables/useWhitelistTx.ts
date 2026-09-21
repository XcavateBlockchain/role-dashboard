import { PublicKey } from '@solana/web3.js'
import type { Transaction } from '@solana/web3.js'
import {
  buildAcceptAuthorityTx,
  buildAddAdminTx,
  buildAssignRoleTx,
  buildInitializeConfigTx,
  buildRemoveAdminTx,
  buildRemoveRoleTx,
  buildRenounceRoleTx,
  buildSetPermissionTx,
  buildUpdateAuthorityTx,
  findAdminPda,
  findConfigPda,
  findRolePda,
} from '~/lib/whitelist/client'
import { getSolanaConnection } from '~/lib/solana/connection'
import { PERMISSIONS, WHITELIST_ERRORS, roleByIndex } from '~/lib/whitelist/constants'

/**
 * User-facing whitelist actions: build the program transaction, sign + send it
 * through the connected wallet, and toast the outcome (with an explorer link).
 * Every action resolves to the confirmed transaction signature and rethrows
 * failures after toasting a friendly message.
 */
export function useWhitelistTx() {
  const wallet = useWallet()
  const toast = useToast()
  const cluster = useRuntimeConfig().public.cluster

  function requireConnected(): PublicKey {
    const address = wallet.address.value
    if (!address) throw new Error('Connect a wallet first')
    return new PublicKey(address)
  }

  function parseAddress(input: string): PublicKey {
    try {
      return new PublicKey(input)
    } catch {
      throw new Error(`Invalid Solana address: ${input}`)
    }
  }

  /** Anchor program error code (6000-6005) from an RPC/wallet error message. */
  function extractProgramErrorCode(message: string): number | null {
    const hex = /custom program error: (0x[0-9a-fA-F]+)/.exec(message)
    if (hex?.[1]) return Number.parseInt(hex[1], 16)
    const custom = /"Custom":\s*(\d+)/.exec(message)
    if (custom?.[1]) return Number.parseInt(custom[1], 10)
    return null
  }

  /** True when the account already exists on-chain (one HTTP fetch). */
  async function accountExists(address: PublicKey): Promise<boolean> {
    return (await getSolanaConnection().getAccountInfo(address, 'confirmed')) !== null
  }

  function friendlyMessage(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err)
    const code = extractProgramErrorCode(message)
    const known = code === null ? undefined : WHITELIST_ERRORS[code]
    if (known) return known
    // System Program "Allocate ... already in use": the instruction tried to
    // create a PDA that already exists (e.g. duplicate role assignment).
    if (message.includes('already in use')) {
      return 'Account already exists on-chain — the action was likely already applied'
    }
    if (message.includes('block height exceeded')) {
      return 'Transaction expired before it was confirmed — try again'
    }
    return message
  }

  async function run(
    successMessage: string,
    build: () => Promise<Transaction>,
  ): Promise<string> {
    try {
      const tx = await build()
      const signature = await wallet.sendTransaction(tx)
      toast.success(successMessage, {
        link: {
          href: `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
          label: 'View on explorer',
        },
      })
      return signature
    } catch (err) {
      toast.error(friendlyMessage(err))
      throw err
    }
  }

  return {
    assignRole(user: string, roleIndex: number): Promise<string> {
      return run(`Role assigned: ${roleByIndex(roleIndex)?.label ?? roleIndex}`, async () => {
        const userKey = parseAddress(user)
        // Pre-check: the program creates the role PDA, so a duplicate assign
        // fails with an opaque System Program "already in use" error.
        const [roleAccount] = findRolePda(userKey, roleIndex)
        if (await accountExists(roleAccount)) {
          throw new Error(`User already has the ${roleByIndex(roleIndex)?.label ?? 'requested'} role`)
        }
        return buildAssignRoleTx({
          adminSigner: requireConnected(),
          user: userKey,
          roleIndex,
        })
      })
    },

    removeRole(user: string, roleIndex: number, rentPayer: string): Promise<string> {
      return run(`Role removed: ${roleByIndex(roleIndex)?.label ?? roleIndex}`, () =>
        buildRemoveRoleTx({
          adminSigner: requireConnected(),
          user: parseAddress(user),
          roleIndex,
          rentPayer: parseAddress(rentPayer),
        }),
      )
    },

    renounceRole(roleIndex: number, rentPayer: string): Promise<string> {
      return run(`Role renounced: ${roleByIndex(roleIndex)?.label ?? roleIndex}`, () =>
        buildRenounceRoleTx({
          user: requireConnected(),
          roleIndex,
          rentPayer: parseAddress(rentPayer),
        }),
      )
    },

    setPermission(user: string, roleIndex: number, permissionIndex: 0 | 1): Promise<string> {
      const permission = PERMISSIONS.find((p) => p.index === permissionIndex)
      return run(`Permission updated: ${permission?.label ?? permissionIndex}`, () =>
        buildSetPermissionTx({
          adminSigner: requireConnected(),
          user: parseAddress(user),
          roleIndex,
          permissionIndex,
        }),
      )
    },

    addAdmin(address: string): Promise<string> {
      return run('Admin added', async () => {
        const newAdmin = parseAddress(address)
        const [adminPda] = findAdminPda(newAdmin)
        if (await accountExists(adminPda)) throw new Error('Address is already an admin')
        return buildAddAdminTx({ authority: requireConnected(), newAdmin })
      })
    },

    removeAdmin(address: string): Promise<string> {
      return run('Admin removed', () =>
        buildRemoveAdminTx({ authority: requireConnected(), adminKey: parseAddress(address) }),
      )
    },

    updateAuthority(newAuthority: string): Promise<string> {
      return run('Authority update proposed', () =>
        buildUpdateAuthorityTx({
          authority: requireConnected(),
          newAuthority: parseAddress(newAuthority),
        }),
      )
    },

    acceptAuthority(): Promise<string> {
      return run('Authority updated', () =>
        buildAcceptAuthorityTx({ newAuthority: requireConnected() }),
      )
    },

    initializeConfig(): Promise<string> {
      return run('Config initialized', async () => {
        const [config] = findConfigPda()
        if (await accountExists(config)) throw new Error('Config is already initialized')
        return buildInitializeConfigTx({ authority: requireConnected() })
      })
    },
  }
}
