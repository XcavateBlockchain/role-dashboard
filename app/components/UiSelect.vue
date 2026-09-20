<script setup lang="ts">
const props = defineProps<{
  label?: string
  error?: string
  disabled?: boolean
  id?: string
}>()

const model = defineModel<string>({ default: '' })
const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="inputId" class="text-sm font-bold">{{ label }}</label>
    <div class="relative">
      <select
        :id="inputId"
        v-model="model"
        :disabled="disabled"
        :aria-invalid="!!error || undefined"
        class="h-11 w-full appearance-none rounded-card border border-line bg-surface px-3 pr-9 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        :class="{ 'border-negative focus:border-negative focus:ring-negative/40': error }"
      >
        <slot />
      </select>
      <svg
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
    <p v-if="error" class="text-xs text-negative">{{ error }}</p>
  </div>
</template>
