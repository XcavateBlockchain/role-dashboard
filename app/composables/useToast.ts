export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
  /** Optional link, e.g. a Solana explorer URL for a transaction. */
  link?: { href: string; label: string }
}

let nextToastId = 1

/** Global toast queue; rendered by <ToastsHost> in the default layout. */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(
    kind: Toast['kind'],
    message: string,
    opts: { timeout?: number; link?: Toast['link'] } = {},
  ) {
    const id = nextToastId++
    toasts.value = [...toasts.value, { id, kind, message, link: opts.link }]
    const timeout = opts.timeout ?? (kind === 'error' ? 8000 : 5000)
    if (import.meta.client && timeout > 0) {
      setTimeout(() => dismiss(id), timeout)
    }
    return id
  }

  return {
    toasts: readonly(toasts),
    dismiss,
    success: (message: string, opts?: Parameters<typeof push>[2]) =>
      push('success', message, opts),
    error: (message: string, opts?: Parameters<typeof push>[2]) =>
      push('error', message, opts),
    info: (message: string, opts?: Parameters<typeof push>[2]) =>
      push('info', message, opts),
  }
}
