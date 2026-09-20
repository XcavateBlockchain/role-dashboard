import type { IndexerAdmin, IndexerConfig } from '~/lib/indexer/types'

/**
 * Shared view of "who is the connected wallet" relative to the whitelist:
 * sudo authority, active admin, or pending authority. Pages use this to gate
 * which action buttons are enabled. Call `refresh()` on mount and after every
 * successful transaction (the indexer trails the chain by a few seconds).
 */
export function useWhitelistAccess() {
  const { address } = useWallet()
  const indexer = useIndexer()

  const config = useState<IndexerConfig | null>('whitelist-config', () => null)
  const admins = useState<IndexerAdmin[]>('whitelist-admins', () => [])
  const loading = useState<boolean>('whitelist-access-loading', () => false)
  const error = useState<string | null>('whitelist-access-error', () => null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const [cfg, adminPage] = await Promise.all([
        indexer.getConfig(),
        indexer.getAdmins({ active: true }, { first: 100, offset: 0 }),
      ])
      config.value = cfg
      admins.value = adminPage.nodes
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  const isAuthority = computed(
    () => !!address.value && config.value?.authority === address.value,
  )
  const isAdmin = computed(
    () => !!address.value && admins.value.some((a) => a.id === address.value),
  )
  const isPendingAuthority = computed(
    () => !!address.value && config.value?.pendingAuthority === address.value,
  )

  return {
    config: readonly(config),
    admins: readonly(admins),
    loading: readonly(loading),
    error: readonly(error),
    refresh,
    isAuthority,
    isAdmin,
    isPendingAuthority,
  }
}
