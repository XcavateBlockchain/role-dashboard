import { Connection } from '@solana/web3.js'

let connection: Connection | null = null

/**
 * Shared connection for browser use. Points at the `/api/rpc` path on the page
 * origin so all RPC traffic goes through the Nitro proxy (which attaches the
 * Alchemy API key server-side). web3.js only accepts absolute http(s)
 * endpoints, so the proxy path is resolved against `window.location.origin`.
 * Websockets are disabled — subscriptions are never used.
 */
export function getSolanaConnection(): Connection {
  if (!connection) {
    const endpoint = new URL('/api/rpc', window.location.origin).toString()
    connection = new Connection(endpoint, {
      commitment: 'confirmed',
      wsEndpoint: undefined,
    })
  }
  return connection
}
