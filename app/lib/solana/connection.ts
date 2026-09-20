import { Connection } from '@solana/web3.js'

let connection: Connection | null = null

/**
 * Shared connection for browser use. Points at the relative `/api/rpc` URL so
 * all RPC traffic goes through the Nitro proxy (which attaches the Alchemy API
 * key server-side). Websockets are disabled — subscriptions are never used.
 */
export function getSolanaConnection(): Connection {
  if (!connection) {
    connection = new Connection('/api/rpc', {
      commitment: 'confirmed',
      wsEndpoint: undefined,
    })
  }
  return connection
}
