<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const ACCENTS: Record<Toast['kind'], string> = {
  success: 'border-l-positive',
  error: 'border-l-negative',
  info: 'border-l-primary',
}
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-20 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-4"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto rounded-card border-l-4 bg-surface p-3 shadow-card"
        :class="ACCENTS[t.kind]"
        role="status"
      >
        <div class="flex items-start gap-2">
          <p class="flex-1 text-sm">{{ t.message }}</p>
          <button
            type="button"
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Dismiss notification"
            @click="dismiss(t.id)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <a
          v-if="t.link"
          :href="t.link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 inline-block text-xs font-bold text-primary underline"
        >
          {{ t.link.label }}
        </a>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
