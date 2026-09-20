// Proxies GraphQL POSTs to the realXmarket indexer (read-only). The indexer URL
// stays server-side; the browser always talks to /api/graphql. The body may be a
// single {query, variables?, operationName?} or a batch array — forwarded raw.
export default defineEventHandler(async (event) => {
  const { indexerUrl } = useRuntimeConfig(event)
  const body = await readRawBody(event)

  try {
    // ignoreResponseError: upstream HTTP statuses (e.g. 400 guard rejections)
    // are data to pass through, not exceptions.
    const response = await $fetch.raw(indexerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      ignoreResponseError: true,
    })
    setResponseStatus(event, response.status)
    return response._data
  } catch {
    // fetch itself failed (DNS, connection refused, reset): the indexer is down.
    throw createError({
      statusCode: 502,
      statusMessage: `Indexer unreachable at ${indexerUrl}`,
    })
  }
})
