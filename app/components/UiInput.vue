<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    error?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    id?: string
  }>(),
  { type: 'text' },
)

const model = defineModel<string>({ default: '' })
const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="inputId" class="text-sm font-bold">{{ label }}</label>
    <input
      :id="inputId"
      v-model="model"
      :type="props.type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="!!error || undefined"
      class="h-11 w-full rounded-card border border-line bg-surface px-3 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      :class="{ 'border-negative focus:border-negative focus:ring-negative/40': error }"
    />
    <p v-if="error" class="text-xs text-negative">{{ error }}</p>
  </div>
</template>
