<script setup>
import { ref, onMounted, watch } from 'vue';
import { useSshKeyStore } from '@/stores/sshKeys';
import { useEnvironmentStore } from '@/stores/environments';

const sshStore = useSshKeyStore();
const envStore = useEnvironmentStore();

const showDialog = ref(false);
const newKey = ref({ title: '', value: '' });
const creating = ref(false);

const loadKeys = () => {
    if (envStore.currentEnvId) {
        sshStore.fetchKeys(envStore.currentEnvId);
    }
};

onMounted(loadKeys);
watch(() => envStore.currentEnvId, loadKeys);

const handleCreate = async () => {
    if (!newKey.value.title || !newKey.value.value) return;
    creating.value = true;
    try {
        await sshStore.addKey({
            ...newKey.value,
            envId: envStore.currentEnvId
        });
        showDialog.value = false;
        newKey.value = { title: '', value: '' };
    } catch (e) {
        alert('Error creating key');
    } finally {
        creating.value = false;
    }
};

const copyString = (str) => {
    navigator.clipboard.writeText(str);
};

const handleDelete = async (id) => {
    if (confirm('Delete this key?')) {
        await sshStore.deleteKey(id);
    }
};
</script>

<template>
    <v-container>
        <div class="d-flex justify-space-between align-center mb-4">
            <h2 class="text-h5">SSH Key Manager</h2>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showDialog = true">
                Add Key
            </v-btn>
        </div>

        <div v-if="!envStore.currentEnvId" class="text-center text-grey mt-10">
            Please select an environment first.
        </div>

        <v-row v-else>
            <v-col cols="12" md="6" lg="4" v-for="key in sshStore.keys" :key="key.id">
                <v-card border elevation="2">
                    <v-card-title class="d-flex justify-space-between text-subtitle-1 font-weight-bold">
                        {{ key.title }}
                        <v-btn icon="mdi-delete" size="x-small" variant="text" color="red" @click="handleDelete(key.id)"></v-btn>
                    </v-card-title>
                    <v-card-text class="bg-grey-lighten-4 pa-3 ma-2 rounded font-monospace text-caption">
                        {{ key.value }}
                    </v-card-text>
                    <v-card-actions>
                        <v-btn block variant="tonal" color="primary" prepend-icon="mdi-content-copy" @click="copyString(key.value)">
                            Copy String
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
            
            <v-col v-if="sshStore.keys.length === 0" cols="12" class="text-center text-grey">
                <v-icon size="64" class="mb-2">mdi-key-variant-off</v-icon>
                <p>No SSH keys found for this environment.</p>
            </v-col>
        </v-row>

        <v-dialog v-model="showDialog" max-width="500">
            <v-card>
                <v-card-title>Add SSH Connection</v-card-title>
                <v-card-text>
                    <v-text-field label="Title (e.g. Web Server)" v-model="newKey.title" variant="outlined"></v-text-field>
                    <v-textarea 
                        label="Connection String / Key" 
                        v-model="newKey.value" 
                        variant="outlined" 
                        placeholder="ssh user@192.168.1.1 -p 22"
                        rows="3"
                    ></v-textarea>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
                    <v-btn color="primary" @click="handleCreate" :loading="creating">Save</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<style scoped>
.font-monospace {
    font-family: monospace;
    word-break: break-all;
}
</style>