import { PublicKey, Transaction } from '@solana/web3.js'
import type { VersionedTransaction } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount, WalletWithFeatures } from '@wallet-standard/base'
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
} from '@wallet-standard/features'
import {
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features'
import bs58 from 'bs58'
import { getSolanaConnection } from '~/lib/solana/connection'

export interface WalletOption {
  /** Wallet Standard name, e.g. "Phantom". */
  name: string
  /** data-URI icon when the wallet provides one. */
  icon?: string
}

/**
 * Wallet Standard connection state and signing.
 *
 * CONTRACT (implemented by the wallet layer — do not change the exported
 * signatures; other components code against them):
 * - `wallets` lists detected browser wallets (Wallet Standard auto-discovery).
 * - `connect(name)` connects and stores the choice for eager reconnect on
 *   reload; `disconnect()` clears it.
 * - `sendTransaction` signs with the connected wallet and submits through the
 *   app's RPC proxy, returning the confirmed transaction signature.
 */
export interface UseWallet {
  wallets: Readonly<Ref<WalletOption[]>>
  /** Connected wallet name; null when disconnected. */
  walletName: Readonly<Ref<string | null>>
  /** Connected account, base58; null when disconnected. */
  address: Readonly<Ref<string | null>>
  connected: Readonly<Ref<boolean>>
  connecting: Readonly<Ref<boolean>>
  connect(name: string): Promise<void>
  disconnect(): Promise<void>
  sendTransaction(tx: Transaction | VersionedTransaction): Promise<string>
}

const STORAGE_KEY = 'wallet'
const CHAIN = 'solana:devnet'

// Module-level (non-reactive) singleton state: the raw Wallet Standard handles.
let detected: Wallet[] = []
let activeWallet: Wallet | null = null
let activeAccount: WalletAccount | null = null
let offChange: (() => void) | null = null
let offRegister: (() => void) | null = null
let offUnregister: (() => void) | null = null
let listenersAttached = false
let autoReconnectAttempted = false

function isUsable(wallet: Wallet): boolean {
  return (
    StandardConnect in wallet.features &&
    (SolanaSignTransaction in wallet.features ||
      SolanaSignAndSendTransaction in wallet.features)
  )
}

function connectFeature(wallet: Wallet) {
  return (wallet as WalletWithFeatures<StandardConnectFeature>).features[StandardConnect]
}

function isUserRejection(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; name?: unknown; message?: unknown }
  // Wallet Standard UserRejectedRequestError (code 4001).
  if (e.code === 4001) return true
  if (typeof e.name === 'string' && e.name.includes('UserRejected')) return true
  return typeof e.message === 'string' && /user rejected/i.test(e.message)
}

function friendlyError(err: unknown): Error {
  if (isUserRejection(err)) return new Error('User rejected the request')
  return err instanceof Error ? err : new Error(String(err))
}

/** Set fee payer + a fresh blockhash, then serialize the transaction for signing. */
async function prepareMessage(
  tx: Transaction | VersionedTransaction,
  account: WalletAccount,
  connection: Connection,
) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  if (tx instanceof Transaction) {
    tx.feePayer ??= new PublicKey(account.address)
    tx.recentBlockhash = blockhash
    // Wallet Standard expects a serialized *transaction* (signatures + message),
    // not bare message bytes.
    return {
      bytes: tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
      blockhash,
      lastValidBlockHeight,
    }
  }
  tx.message.recentBlockhash = blockhash
  return { bytes: tx.serialize(), blockhash, lastValidBlockHeight }
}

export function useWallet(): UseWallet {
  const wallets = useState<WalletOption[]>('wallet.wallets', () => [])
  const walletName = useState<string | null>('wallet.name', () => null)
  const address = useState<string | null>('wallet.address', () => null)
  const connecting = useState<boolean>('wallet.connecting', () => false)
  const connected = computed(() => address.value !== null)

  function syncWalletOptions() {
    const seen = new Set<string>()
    wallets.value = detected.filter(isUsable).flatMap(({ name, icon }) => {
      if (seen.has(name)) return []
      seen.add(name)
      return [{ name, icon }]
    })
  }

  function clearActive() {
    offChange?.()
    offChange = null
    activeWallet = null
    activeAccount = null
    walletName.value = null
    address.value = null
  }

  function setActive(wallet: Wallet, account: WalletAccount) {
    offChange?.()
    offChange = null
    activeWallet = wallet
    activeAccount = account
    walletName.value = wallet.name
    address.value = account.address
    if (StandardEvents in wallet.features) {
      const events = (wallet as WalletWithFeatures<StandardEventsFeature>).features[
        StandardEvents
      ]
      offChange = events.on('change', ({ accounts }) => {
        if (!accounts) return
        const next = accounts[0]
        if (next) {
          activeAccount = next
          address.value = next.address
        } else {
          // Access revoked or wallet locked.
          localStorage.removeItem(STORAGE_KEY)
          clearActive()
        }
      })
    }
  }

  async function connect(name: string) {
    const wallet = detected.find((w) => w.name === name && isUsable(w))
    if (!wallet) throw new Error(`Wallet not found: ${name}`)
    connecting.value = true
    try {
      const { accounts } = await connectFeature(wallet).connect()
      const account = accounts[0]
      if (!account) throw new Error('Wallet returned no accounts')
      setActive(wallet, account)
      localStorage.setItem(STORAGE_KEY, wallet.name)
    } catch (err) {
      throw friendlyError(err)
    } finally {
      connecting.value = false
    }
  }

  async function disconnect() {
    localStorage.removeItem(STORAGE_KEY)
    const wallet = activeWallet
    clearActive()
    if (wallet && StandardDisconnect in wallet.features) {
      try {
        await (wallet as WalletWithFeatures<StandardDisconnectFeature>).features[
          StandardDisconnect
        ].disconnect()
      } catch {
        // Best effort — local state is already cleared.
      }
    }
  }

  /** Eager reconnect after reload: silently reconnect the persisted wallet. */
  async function autoReconnect() {
    if (autoReconnectAttempted) return
    autoReconnectAttempted = true
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved || activeWallet) return
    // Wallets inject/register asynchronously; retry briefly while the list settles.
    for (let attempt = 0; attempt < 20; attempt++) {
      const wallet = detected.find((w) => w.name === saved && isUsable(w))
      if (wallet) {
        connecting.value = true
        try {
          const { accounts } = await connectFeature(wallet).connect({ silent: true })
          const account = accounts[0]
          if (account) setActive(wallet, account)
        } catch {
          // Not authorized anymore — stay disconnected.
        } finally {
          connecting.value = false
        }
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  async function sendTransaction(tx: Transaction | VersionedTransaction): Promise<string> {
    const wallet = activeWallet
    const account = activeAccount
    if (!wallet || !account) throw new Error('Wallet not connected')
    const connection = getSolanaConnection()
    try {
      const prepared = await prepareMessage(tx, account, connection)
      if (SolanaSignTransaction in wallet.features) {
        // Preferred: sign via the wallet, submit through our Alchemy RPC proxy.
        const [output] = await (
          wallet as WalletWithFeatures<SolanaSignTransactionFeature>
        ).features[SolanaSignTransaction].signTransaction({
          account,
          transaction: prepared.bytes,
          chain: CHAIN,
        })
        if (!output) throw new Error('Wallet returned no signed transaction')
        const signature = await connection.sendRawTransaction(output.signedTransaction, {
          preflightCommitment: 'confirmed',
        })
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash: prepared.blockhash,
            lastValidBlockHeight: prepared.lastValidBlockHeight,
          },
          'confirmed',
        )
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }
        return signature
      }
      if (SolanaSignAndSendTransaction in wallet.features) {
        // Fallback: the wallet signs and submits through its own RPC.
        const [output] = await (
          wallet as WalletWithFeatures<SolanaSignAndSendTransactionFeature>
        ).features[SolanaSignAndSendTransaction].signAndSendTransaction({
          account,
          transaction: prepared.bytes,
          chain: CHAIN,
          options: { commitment: 'confirmed' },
        })
        if (!output) throw new Error('Wallet returned no signature')
        const sig: Uint8Array | string = output.signature
        return typeof sig === 'string' ? sig : bs58.encode(sig)
      }
      throw new Error('Connected wallet cannot sign Solana transactions')
    } catch (err) {
      throw friendlyError(err)
    }
  }

  if (import.meta.client && !listenersAttached) {
    listenersAttached = true
    const api = getWallets()
    detected = [...api.get()]
    syncWalletOptions()
    offRegister = api.on('register', (...registered) => {
      detected = [...detected.filter((w) => !registered.includes(w)), ...registered]
      syncWalletOptions()
    })
    offUnregister = api.on('unregister', (...unregistered) => {
      detected = detected.filter((w) => !unregistered.includes(w))
      syncWalletOptions()
    })
    void autoReconnect()
  }

  // Plain refs satisfy Readonly<Ref<…>> (a readonly() wrapper would wrap the
  // array in DeepReadonly and break the contract's type).
  return {
    wallets,
    walletName,
    address,
    connected,
    connecting,
    connect,
    disconnect,
    sendTransaction,
  }
}
