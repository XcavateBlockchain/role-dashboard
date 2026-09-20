const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** RFC3339 → localized medium date + short time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d)
}

/** Short relative time like "3m ago" / "2h ago" / "5d ago". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** Middle-ellipsis truncation for base58 addresses/signatures. */
export function truncateAddress(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 3) return value
  return `${value.slice(0, chars)}…${value.slice(-chars)}`
}

export function explorerTxUrl(signature: string, cluster: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
}

export function explorerAddressUrl(address: string, cluster: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`
}
