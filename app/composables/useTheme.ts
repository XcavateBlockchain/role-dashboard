export type ThemeMode = 'light' | 'dark'

const LIGHT: ThemeMode = 'light'
const DARK: ThemeMode = 'dark'

/** Apply the resolved scheme to <html> and the color-scheme meta (client only). */
export function applyResolvedTheme(resolved: ThemeMode, pinned: ThemeMode | null) {
  const root = document.documentElement
  root.classList.toggle(DARK, resolved === DARK)
  root.classList.toggle(LIGHT, resolved === LIGHT)
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute('content', pinned ?? 'light dark')
}

/**
 * Pinned theme in localStorage key 'theme'; null follows the system scheme.
 * The pre-paint class is set by an inline script in nuxt.config; the
 * theme.client plugin syncs this state and watches the system scheme.
 */
export function useTheme() {
  const pinned = useState<ThemeMode | null>('theme-pinned', () => null)
  const systemDark = useState<boolean>('theme-system-dark', () => false)

  const resolved = computed<ThemeMode>(() =>
    pinned.value ?? (systemDark.value ? DARK : LIGHT),
  )

  function setPinned(value: ThemeMode | null) {
    pinned.value = value
    try {
      if (value) localStorage.setItem('theme', value)
      else localStorage.removeItem('theme')
    } catch {
      // storage unavailable — state still applies for this session
    }
  }

  /** Pin the opposite of the current resolved scheme. */
  function toggle() {
    setPinned(resolved.value === DARK ? LIGHT : DARK)
  }

  /** Clear the pin and follow the system scheme again. */
  function resetToSystem() {
    setPinned(null)
  }

  return {
    pinned: readonly(pinned),
    resolved,
    toggle,
    resetToSystem,
  }
}
