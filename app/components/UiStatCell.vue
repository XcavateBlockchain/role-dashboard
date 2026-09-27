<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
}>()
</script>

<template>
  <UiCard class="flex min-h-20 min-w-0 flex-col justify-center gap-0.5">
    <span class="truncate text-xs text-ink-muted">{{ title }}</span>
    <span class="whitespace-nowrap text-xl font-extrabold text-primary">{{ value }}</span>
    <slot />
  </UiCard>
</template>
