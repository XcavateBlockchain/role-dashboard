<script setup lang="ts">
import { PublicKey } from '@solana/web3.js'
import { ROLES } from '~/lib/whitelist/constants'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{ close: []; assigned: [] }>()

const tx = useWhitelistTx()

const user = ref('')
const roleIndex = ref('')
const userError = ref('')
const submitting = ref(false)

const selectedRole = computed(() => ROLES.find((r) => String(r.index) === roleIndex.value))

watch(
  () => props.open,
  (open) => {
    if (open) {
      user.value = ''
      roleIndex.value = ''
      userError.value = ''
      submitting.value = false
    }
  },
)

async function submit() {
  userError.value = ''
  const trimmed = user.value.trim()
  try {
    new PublicKey(trimmed)
  } catch {
    userError.value = 'Enter a valid Solana address'
    return
  }
  if (!selectedRole.value) return
  submitting.value = true
  try {
    await tx.assignRole(trimmed, selectedRole.value.index)
    emit('assigned')
    emit('close')
  } catch {
    // Failure already toasted by useWhitelistTx.
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiModal :open="open" footer-align="start" @close="emit('close')">
    <template #title>Assign role</template>

    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <UiInput
        v-model="user"
        label="User address"
        placeholder="Base58 Solana address"
        :error="userError"
      />
      <div>
        <UiSelect v-model="roleIndex" label="Role">
          <option value="" disabled>Select a role</option>
          <option v-for="role in ROLES" :key="role.index" :value="String(role.index)">
            {{ role.label }}
          </option>
        </UiSelect>
      </div>
    </form>

    <template #footer>
      <UiButton
        type="submit"
        :loading="submitting"
        :disabled="!selectedRole || !user.trim()"
        @click="submit"
      >
        Assign role
      </UiButton>
      <UiButton variant="ghost" :disabled="submitting" @click="emit('close')">Cancel</UiButton>
    </template>
  </UiModal>
</template>
