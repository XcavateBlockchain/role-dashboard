<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

useHead({ title: `${props.error.statusCode} · realXmarket Role Dashboard` })

const message = computed(
  () =>
    props.error.statusMessage ||
    props.error.message ||
    'Something went wrong while loading this page.',
)

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-ink">
    <div class="h-1.5 w-40 rounded-full bg-brand-gradient" aria-hidden="true" />
    <UiCard class="mt-6 flex w-full max-w-sm flex-col items-center gap-2 p-8 text-center">
      <img src="/logo-black.svg" alt="realXmarket" class="h-10 w-10 dark:hidden" />
      <img src="/logo-white.svg" alt="realXmarket" class="hidden h-10 w-10 dark:block" />
      <p class="mt-2 text-5xl font-extrabold text-primary">{{ error.statusCode }}</p>
      <p class="text-sm text-ink-muted">{{ message }}</p>
      <UiButton class="mt-4" @click="goHome">Back home</UiButton>
    </UiCard>
  </div>
</template>
