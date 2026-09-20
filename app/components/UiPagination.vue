<script setup lang="ts">
const props = defineProps<{
  /** Total number of rows across all pages. */
  total: number
  /** Page size (rows per page). */
  first: number
  /** Offset of the first row of the current page. */
  offset: number
}>()

const emit = defineEmits<{ update: [offset: number] }>()

const from = computed(() => (props.total === 0 ? 0 : props.offset + 1))
const to = computed(() => Math.min(props.offset + props.first, props.total))
const canPrev = computed(() => props.offset > 0)
const canNext = computed(() => props.offset + props.first < props.total)

const pill =
  'inline-flex h-9 items-center gap-1 rounded-full border-2 border-primary px-4 text-sm font-bold text-primary transition hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:border-primary-dim disabled:text-primary-dim disabled:opacity-70'
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <span class="text-xs text-ink-muted">Showing {{ from }}–{{ to }} of {{ total }}</span>
    <div class="flex gap-2">
      <button
        type="button"
        :class="pill"
        :disabled="!canPrev"
        aria-label="Previous page"
        @click="emit('update', Math.max(0, offset - first))"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Prev
      </button>
      <button
        type="button"
        :class="pill"
        :disabled="!canNext"
        aria-label="Next page"
        @click="emit('update', offset + first)"
      >
        Next
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
</template>
