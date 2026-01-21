<script setup>
import { ref } from 'vue'
import { useSecretStore } from '@/stores/secrets'

const secretContent = ref('');
const secretFile = ref(null);
const password = ref('');
const ttl = ref(60 * 24); 
const generatedLink = ref('');
const loading = ref(false)
const secretStore = useSecretStore()
const showPassword = ref(false)

const ttlOptions = [
    { title: '1 Hour', value: 60 },
    { title: '1 Day', value: 60 * 24 },
    { title: '3 Days', value: 60 * 24 * 3 },
    { title: '7 Days', value: 60 * 24 * 7 },
];

const handleCreate = async () => {
    if(!secretContent.value && !secretFile.value) return;

    loading.value = true;

    try{
        const { id, key } = await secretStore.createSecret({
            text: secretContent.value,
            file: secretFile.value,
            password: password.value,
            ttlInMinutes: ttl.value
        });
        
        generatedLink.value = `${window.location.origin}/secrets/view/${id}#${key}`
        
        secretContent.value = '';
        secretFile.value = null;
        password.value = '';
    } catch (e) {
        alert('An error occurred: ' + e.message)
    } finally {
        loading.value = false
    }
}

const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink.value);
    alert('Link copied! Keep it safe, it contains the decryption key.');
}

</script>

<template>
    <v-card class="mx-auto" max-width="600">
        <v-card-title class="bg-primary text-white">Share Secret</v-card-title>
        
        <v-card-text class="pt-4">
            <template v-if="!generatedLink">
                <v-textarea
                    v-model="secretContent"
                    label="Secret Text"
                    variant="outlined"
                    rows="4"
                    placeholder="Sensitive data..."
                ></v-textarea>

                <v-file-input
                    v-model="secretFile"
                    label="Attach File (Optional)"
                    variant="outlined"
                    prepend-icon="mdi-paperclip"
                    show-size
                ></v-file-input>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-text-field
                            v-model="password"
                            label="Password Protection (Optional)"
                            :type="showPassword ? 'text' : 'password'"
                            variant="outlined"
                            prepend-inner-icon="mdi-lock"
                            :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                            @onclick:append-inner="showPassword = !showPassword"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select
                            v-model="ttl"
                            :items="ttlOptions"
                            label="Expires In"
                            variant="outlined"
                        ></v-select>
                    </v-col>
                </v-row>
                
                <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                    Data is encrypted in your browser. Even we cannot read it.
                </v-alert>
            </template>

            <div v-else class="text-center pa-4 bg-grey-darken-4 rounded">
                <p class="mb-2 text-success font-weight-bold">Secret created successfully!</p>
                <v-code class="d-block mb-4 pa-3 rounded text-break">{{ generatedLink }}</v-code>
                
                <v-btn color="secondary" @click="copyToClipboard" prepend-icon="mdi-content-copy" class="mr-2">
                    Copy Link
                </v-btn>
                <v-btn variant="text" @click="generatedLink = ''">
                    Create New
                </v-btn>
            </div>
        </v-card-text>

        <v-card-actions v-if="!generatedLink" class="pa-4">
            <v-btn
                block
                color="primary"
                size="large"
                variant="elevated"
                @click="handleCreate"
                :loading="loading"
                :disabled="!secretContent && !secretFile"
            >
                Encrypt & Generate Link
            </v-btn>
        </v-card-actions>
    </v-card>
</template>