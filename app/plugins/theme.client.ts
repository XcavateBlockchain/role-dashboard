import { applyResolvedTheme } from '~/composables/useTheme'

/** Syncs theme state with localStorage + the system scheme before mount. */
export default defineNuxtPlugin(() => {
  const pinned = useState<'light' | 'dark' | null>('theme-pinned')
  const systemDark = useState<boolean>('theme-system-dark')

  try {
    const stored = localStorage.getItem('theme')
    pinned.value = stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    pinned.value = null
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mq.matches

  const apply = () =>
    applyResolvedTheme(pinned.value ?? (mq.matches ? 'dark' : 'light'), pinned.value)

  apply()
  mq.addEventListener('change', (e) => {
    systemDark.value = e.matches
    apply()
  })
  watch(pinned, apply)
})
