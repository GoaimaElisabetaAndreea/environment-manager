<script setup>
import { ref } from 'vue'
import { useSecretStore } from '@/stores/secrets'

const secretContent = ref('');
const generatedLink = ref('');
const loading = ref(false)
const secretStore = useSecretStore()

const handleCreate = async () => {
    if(!secretContent.value) 
        return;

    loading.value = true;

    try{
        const id = await secretStore.createSecret(secretContent.value);
        generatedLink.value = `${window.location.origin}/secrets/view/${id}`
        secretContent.value = '';
    }catch (e) {
        alert('An error occurred')
    } finally {
        loading.value = false
    }
}

const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink.value);
    alert('Link copied!');
}
</script>

<template>
    <v-card class="mx-auto" max-width="600">
        <v-card-title>Share a Secret</v-card-title>
        <v-card-subtitle>
            Paste here the secret. After the recipient sees it, the secret will be deleted.
        </v-card-subtitle>
        <v-card-text>
            <v-textarea
                v-if="!generatedLink"
                v-model="secretContent"
                label="Secret content"
                variant="outlined"
                rows="5"
                placeholder="DB_PASSWORD=super_secret..."
            ></v-textarea>

            <div v-else class="text-center pa-4 bg-grey-darken-4 rounded">
                <p class="mb-2 text-success">Secret generated!</p>
                <v-code class="d-block mb-4 pa-2">{{ generatedLink }}</v-code>
                <v-btn color="secondary" @click="copyToClipboard" prepend-icon="mdi-content-copy">
                    Copy Link
                </v-btn>
                <v-btn variant="text" class="ml-2" @click="generatedLink = ''">
                    Create New
                </v-btn>
            </div>
        </v-card-text>

        <v-card-actions v-if="!generatedLink">
            <v-btn
            block
            color="primary"
            variant="elevated"
            @click="handleCreate"
            :loading=loading
            :disabled="!secretContent">
                Get Secure Link
            </v-btn>
        </v-card-actions>
    </v-card>
</template>