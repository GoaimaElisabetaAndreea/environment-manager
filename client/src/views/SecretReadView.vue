<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSecretStore } from '@/stores/secrets'

const route = useRoute()
const secretStore = useSecretStore()
const secretData = ref(null)
const errorMsg = ref(null)
const revealed = ref(false)

const id = route.params.id

const revealSecret = async () => {
  try {
    const content = await secretStore.getSecret(id)
    secretData.value = content
    revealed.value = true
  } catch (e) {
    errorMsg.value = e.message
  }
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(secretData.value)
  alert('Copied!')
}
</script>
<template>
  <v-container class="fill-height justify-center">
    <v-card class="elevation-10" width="500">
      <v-card-title class="text-center">Secret Message</v-card-title>

      <v-card-text class="text-center">
        <div v-if="!revealed && !errorMsg">
          <v-icon size="64" color="warning" class="mb-4">mdi-fire-alert</v-icon>
          <p class="text-body-1 mb-4">
            This secret will be <strong>deleted</strong> after you see it.
          </p>
          <v-btn color="error" size="large" @click="revealSecret"> See the secret. </v-btn>
        </div>

        <div v-else-if="revealed">
          <v-alert type="success" variant="tonal" class="mb-4"> Secret seen and deleted. </v-alert>
          <v-textarea
            model-value="secretData"
            :value="secretData"
            readonly
            variant="outlined"
            bg-color="grey-darken-4"
            rows="6"
          ></v-textarea>
          <v-btn color="secondary" @click="copyToClipboard" prepend-icon="mdi-content-copy">
            Copy
          </v-btn>
        </div>

        <div v-else>
          <v-icon size="64" color="grey" class="mb-4">mdi-ghost</v-icon>
          <h3 class="text-h5">Oops!</h3>
          <p class="mt-2">{{ errorMsg }}</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>
