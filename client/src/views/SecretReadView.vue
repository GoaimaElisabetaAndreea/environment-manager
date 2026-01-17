<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSecretStore } from '@/stores/secrets'

const route = useRoute()
const secretStore = useSecretStore()

const id = route.params.id

const encryptionKey = route.hash.substring(1);

const loading = ref(true)
const metaData = ref(null) 
const passwordInput = ref('')
const secretData = ref(null) 
const errorMsg = ref(null)
const revealed = ref(false)

onMounted(async () => {
    if (!encryptionKey) {
        errorMsg.value = "Invalid Link: Missing encryption key."
        loading.value = false;
        return;
    }
    
    try {
        metaData.value = await secretStore.getSecretMetaData(id);
    } catch (e) {
        errorMsg.value = e.message;
    } finally {
        loading.value = false;
    }
})

const handleReveal = async () => {
    loading.value = true;
    errorMsg.value = '';
    
    try {
        const result = await secretStore.revealSecret(id, encryptionKey, passwordInput.value);
        secretData.value = result;
        revealed.value = true;
    } catch (e) {
        errorMsg.value = e.message;
    } finally {
        loading.value = false;
    }
}

const copyToClipboard = () => {
    if(secretData.value?.text) {
        navigator.clipboard.writeText(secretData.value.text)
        alert('Text Copied!')
    }
}

const downloadFile = () => {
    if (secretData.value?.file) {
        const link = document.createElement('a');
        link.href = secretData.value.file.dataUrl;
        link.download = secretData.value.file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
</script>

<template>
  <v-container class="fill-height justify-center">
    <v-card class="elevation-10" width="600">
      <v-card-title class="text-center bg-grey-lighten-4">
        <v-icon icon="mdi-shield-lock" color="primary" class="mr-2"></v-icon>
        Secure Secret Message
      </v-card-title>

      <v-card-text class="text-center pt-6">
        <div v-if="loading" class="d-flex justify-center my-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>

        <div v-else-if="errorMsg">
          <v-icon size="64" color="red-lighten-2" class="mb-4">mdi-alert-circle</v-icon>
          <h3 class="text-h5 text-red">Access Denied</h3>
          <p class="mt-2">{{ errorMsg }}</p>
        </div>

        <div v-else-if="revealed">
          <v-alert type="success" variant="tonal" class="mb-4" icon="mdi-check-circle">
            Secret decrypted successfully. It has been deleted from the server.
          </v-alert>
          
          <div v-if="secretData.text">
              <v-label>Secret Message</v-label>
              <v-textarea
                :model-value="secretData.text"
                readonly
                variant="outlined"
                bg-color="grey-lighten-5"
                rows="6"
                class="mt-2"
              ></v-textarea>
              <v-btn color="secondary" @click="copyToClipboard" prepend-icon="mdi-content-copy" block class="mb-4">
                Copy Text
              </v-btn>
          </div>

          <div v-if="secretData.file">
              <v-divider class="my-4"></v-divider>
              <v-label>Attached File</v-label>
              <div class="d-flex align-center justify-center pa-4 border rounded mt-2 bg-grey-lighten-5">
                  <v-icon icon="mdi-file-document-outline" size="large" class="mr-2"></v-icon>
                  <span class="text-h6 mr-4">{{ secretData.file.name }}</span>
                  <v-btn color="primary" @click="downloadFile" prepend-icon="mdi-download">
                      Download
                  </v-btn>
              </div>
          </div>
        </div>

        <div v-else>
          <v-icon size="64" color="warning" class="mb-4">mdi-incognito</v-icon>
          <p class="text-body-1 mb-4">
            This secret will be <strong>permanently deleted</strong> after you view it.
          </p>

          <v-text-field
            v-if="metaData?.hasPassword"
            v-model="passwordInput"
            label="Enter Password to Decrypt"
            type="password"
            variant="outlined"
            prepend-inner-icon="mdi-lock"
            class="mb-2"
          ></v-text-field>

          <v-btn 
            color="primary" 
            size="large" 
            @click="handleReveal"
            prepend-icon="mdi-eye"
            :disabled="metaData?.hasPassword && !passwordInput"
          > 
            Reveal Secret
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>