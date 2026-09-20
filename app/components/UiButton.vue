<script setup lang="ts">
type UiButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const props = withDefaults(
  defineProps<{
    variant?: UiButtonVariant
    /** Replaces the label with a spinner and blocks interaction. */
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'primary', type: 'button' },
)

// Pill button (48px, radius 24, extrabold) from the mobile app's Styles.xaml.
const VARIANTS: Record<UiButtonVariant, string> = {
  primary:
    'bg-primary-btn text-primary-btn-ink border-2 border-transparent hover:opacity-90 disabled:bg-primary-dim disabled:text-primary-btn-ink',
  secondary:
    'bg-transparent text-primary border-2 border-primary hover:bg-surface-tint disabled:border-primary-dim disabled:text-primary-dim',
  danger:
    'bg-transparent text-negative border-2 border-negative hover:bg-negative/10 disabled:border-primary-dim disabled:text-primary-dim',
  ghost:
    'bg-transparent text-primary border-2 border-transparent hover:bg-surface-muted disabled:text-primary-dim',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-button px-6 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:opacity-70"
    :class="VARIANTS[props.variant]"
  >
    <UiSpinner v-if="loading" :size="18" />
    <slot v-else />
  </button>
</template>
