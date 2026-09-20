<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-1 py-10 text-center">
    <div class="mb-1 text-ink-faint">
      <slot name="icon" />
    </div>
    <p class="text-sm font-extrabold">{{ title }}</p>
    <p v-if="hint" class="text-xs text-ink-muted">{{ hint }}</p>
    <slot />
  </div>
</template>
