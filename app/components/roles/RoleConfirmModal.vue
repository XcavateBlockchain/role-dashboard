<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    confirmLabel?: string
    loading?: boolean
  }>(),
  { confirmLabel: 'Confirm' },
)

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #title>
      <slot name="title" />
    </template>

    <div class="text-sm text-ink-muted">
      <slot />
    </div>

    <template #footer>
      <UiButton variant="ghost" :disabled="loading" @click="emit('close')">Cancel</UiButton>
      <UiButton variant="danger" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </UiButton>
    </template>
  </UiModal>
</template>
