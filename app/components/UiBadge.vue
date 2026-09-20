<script setup lang="ts">
type UiBadgeTone = 'neutral' | 'success' | 'error' | 'info' | 'cyan'

const props = withDefaults(defineProps<{ tone?: UiBadgeTone }>(), { tone: 'neutral' })

const TONES: Record<UiBadgeTone, string> = {
  neutral: 'bg-badge text-ink',
  success: 'bg-positive text-white',
  error: 'bg-negative text-gray-900',
  info: 'bg-primary text-white',
  cyan: 'bg-tertiary text-gray-900',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-bold"
    :class="TONES[props.tone]"
  >
    <slot />
  </span>
</template>
