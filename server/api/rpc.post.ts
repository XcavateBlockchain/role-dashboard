import { $fetch } from 'ofetch'

/**
 * Solana JSON-RPC proxy. The browser posts to `/api/rpc`; the request is
 * forwarded to Alchemy with the API key appended server-side so the key never
 * reaches the client. The key is part of the upstream URL — never log it.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.alchemyApiKey) {
    throw createError({
      statusCode: 500,
      message: 'NUXT_ALCHEMY_API_KEY is not configured',
    })
  }

  // Forward the body verbatim (may be a single JSON-RPC call or a batch array).
  const body = await readRawBody(event)

  let response
  try {
    response = await $fetch.raw(`${config.alchemyRpcUrl}${config.alchemyApiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      // Pass upstream error statuses through instead of throwing.
      ignoreResponseError: true,
    })
  } catch {
    throw createError({ statusCode: 502, message: 'Upstream RPC request failed' })
  }

  setResponseStatus(event, response.status)
  return response._data
})
