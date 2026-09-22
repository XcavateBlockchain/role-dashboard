<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
  footerAlign?: 'start' | 'end'
}>()

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const mounted = ref(false)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      panel.value?.focus()
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onMounted(() => (mounted.value = true))
onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport v-if="mounted && open" to="body">
    <div
      class="fixed inset-0 z-40 flex items-center justify-center bg-backdrop p-4"
      @click.self="emit('close')"
    >
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title || $slots.title ? titleId : undefined"
        tabindex="-1"
        class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-card bg-surface p-5 shadow-card focus:outline-none"
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <h2 :id="titleId" class="text-base font-extrabold">
            <slot name="title">{{ title }}</slot>
          </h2>
          <button
            type="button"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
            @click="emit('close')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <slot />
        <div
          v-if="$slots.footer"
          class="mt-5 flex gap-2"
          :class="footerAlign === 'start' ? 'justify-start' : 'justify-end'"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
