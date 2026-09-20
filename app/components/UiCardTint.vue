<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>

<template>
  <div class="rounded-card bg-surface-tint" :class="{ 'p-4': padded }">
    <slot />
  </div>
</template>
