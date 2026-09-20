<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 20 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    class="shrink-0 animate-spin"
    role="status"
    aria-label="Loading"
  >
    <circle
      cx="12"
      cy="12"
      r="9.5"
      stroke="currentColor"
      stroke-opacity="0.25"
      stroke-width="3"
    />
    <path
      d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>
</template>
