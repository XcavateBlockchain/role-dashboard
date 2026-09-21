<script setup lang="ts">
import { PublicKey } from '@solana/web3.js'
import { ROLES, roleLabel } from '~/lib/whitelist/constants'
import type { AccessCheck } from '~/lib/indexer/types'

const indexer = useIndexer()

const user = ref('')
const role = ref<string>(ROLES[0]?.gql ?? '')
const userError = ref('')
const checking = ref(false)
const checkError = ref('')
const result = ref<AccessCheck | null>(null)
const checkedLabel = ref('')

async function check() {
  userError.value = ''
  checkError.value = ''
  result.value = null
  const trimmed = user.value.trim()
  try {
    new PublicKey(trimmed)
  } catch {
    userError.value = 'Enter a valid Solana address'
    return
  }
  checking.value = true
  try {
    result.value = await indexer.checkAccess(trimmed, role.value)
    checkedLabel.value = roleLabel(role.value)
  } catch (e) {
    checkError.value = e instanceof Error ? e.message : String(e)
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <UiCardTint>
    <p class="text-sm font-extrabold">Check access</p>

    <form
      class="mt-3 flex flex-wrap items-end gap-3"
      @submit.prevent="check"
    >
      <div class="min-w-56 flex-1">
        <UiInput
          v-model="user"
          label="User address"
          placeholder="Base58 Solana address"
          :error="userError"
        />
      </div>
      <div class="w-full sm:w-56">
        <UiSelect v-model="role" label="Role">
          <option v-for="r in ROLES" :key="r.gql" :value="r.gql">{{ r.label }}</option>
        </UiSelect>
      </div>
      <UiButton variant="secondary" type="submit" :loading="checking" class="shrink-0">
        Check
      </UiButton>
    </form>

    <div v-if="result" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <template v-if="result.hasRole">
        <span class="font-bold text-positive">✓ has role</span>
        <UiBadge v-if="result.compliant" tone="success">Compliant</UiBadge>
        <UiBadge v-else tone="error">Revoked</UiBadge>
      </template>
      <template v-else>
        <span class="font-bold text-ink-muted">No role</span>
      </template>
      <span class="text-xs text-ink-muted">· {{ checkedLabel }}</span>
    </div>
    <p v-else-if="checkError" class="mt-3 text-sm text-negative">{{ checkError }}</p>
  </UiCardTint>
</template>
