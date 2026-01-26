<script setup>
import { ref, watch, onMounted } from 'vue'
import { useEnvironmentStore } from '@/stores/environments'

const envStore = useEnvironmentStore()

const isEditing = ref(false)
const wikiContent = ref('')
const saving = ref(false)

const loadContent = () => {
    if (envStore.currentEnvironment) {
        wikiContent.value = envStore.currentEnvironment.wikiContent || ''
    } else {
        wikiContent.value = ''
    }
}

onMounted(() => {
    loadContent()
})

watch(() => envStore.currentEnvId, () => {
    loadContent()
    isEditing.value = false
})

const enableEdit = () => {
    isEditing.value = true
}

const cancelEdit = () => {
    loadContent()
    isEditing.value = false
}

const handleSave = async () => {
    if (!envStore.currentEnvId) return

    saving.value = true
    try {
        await envStore.updateEnvironment(envStore.currentEnvId, {
            wikiContent: wikiContent.value
        })
        isEditing.value = false
    } catch (e) {
        snackbar.showError('Failed to save wiki: ' + e.message)
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <v-container fluid class="fill-height align-start pa-0">
        <v-row no-gutters class="fill-height">
            <v-col cols="12" class="fill-height">
                <div v-if="!envStore.currentEnvironment" class="d-flex flex-column align-center justify-center h-100 mt-10">
                    <v-icon size="64" color="grey-lighten-1">mdi-book-open-blank-variant</v-icon>
                    <h2 class="text-grey mt-4">No Environment Selected</h2>
                    <p class="text-grey-darken-1">Select an environment to view its wiki.</p>
                </div>

                <div v-else class="d-flex flex-column h-100 pa-4">
                    <div class="d-flex justify-space-between align-center mb-4">
                        <div>
                            <h1 class="text-h4 font-weight-bold text-primary">
                                {{ envStore.currentEnvironment.name }} Wiki
                            </h1>
                            <span class="text-subtitle-1 text-grey">Onboarding & Documentation</span>
                        </div>
                        <div v-if="!isEditing">
                            <v-btn
                                color="primary"
                                prepend-icon="mdi-pencil"
                                @click="enableEdit"
                            >
                                Edit Wiki
                            </v-btn>
                        </div>
                        <div v-else>
                            <v-btn
                                variant="text"
                                class="mr-2"
                                @click="cancelEdit"
                                :disabled="saving"
                            >
                                Cancel
                            </v-btn>
                            <v-btn
                                color="success"
                                prepend-icon="mdi-content-save"
                                @click="handleSave"
                                :loading="saving"
                            >
                                Save Changes
                            </v-btn>
                        </div>
                    </div>

                    <v-card class="flex-grow-1 d-flex flex-column" border>
                        <v-card-text class="flex-grow-1 pa-0 d-flex flex-column h-100">
                            <div v-if="isEditing" class="d-flex flex-column h-100">
                                <v-textarea
                                    v-model="wikiContent"
                                    placeholder="# Project Setup&#10;&#10;1. Install dependencies...&#10;2. Configure .env..."
                                    variant="solo-filled"
                                    hide-details
                                    class="flex-grow-1 wiki-editor h-100"
                                    no-resize
                                ></v-textarea>
                            </div>
                            
                            <div v-else class="pa-6 h-100 wiki-content">
                                <div v-if="wikiContent" class="text-body-1" style="white-space: pre-wrap;">{{ wikiContent }}</div>
                                <div v-else class="d-flex flex-column align-center justify-center h-100 text-grey">
                                    <v-icon size="48" class="mb-2">mdi-text-box-plus-outline</v-icon>
                                    <p>This environment has no documentation yet.</p>
                                    <v-btn variant="text" color="primary" class="mt-2" @click="enableEdit">
                                        Start Writing
                                    </v-btn>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </div>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>
.wiki-editor :deep(.v-field__input) {
    font-family: monospace;
    height: 100% !important; 
}
.wiki-editor :deep(.v-input__control),
.wiki-editor :deep(.v-field) {
    height: 100%;
}
.wiki-content {
    overflow-y: auto;
    font-family: sans-serif;
    line-height: 1.6;
}
</style>