<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useSshKeyStore } from '@/stores/sshKeys';
import { useEnvironmentStore } from '@/stores/environments';
import { useAuthStore } from '@/stores/auth'; 

const sshStore = useSshKeyStore();
const envStore = useEnvironmentStore();
const authStore = useAuthStore(); 

const showDialog = ref(false); 
const isEditing = ref(false);
const editingId = ref(null); 

const newKey = ref({ title: '', value: '', alias: '' }); 
const creating = ref(false);

const showConfigDialog = ref(false); 
const generatedConfig = ref('');     
const activeTab = ref('preview');
const testingId = ref(null);

const loadKeys = () => {
    if (envStore.currentEnvId && authStore.user) {
        sshStore.fetchKeys(envStore.currentEnvId);
    }
};

onMounted(loadKeys);

watch(() => envStore.currentEnvId, loadKeys);
watch(() => authStore.user, (newUser) => {
    if (newUser) loadKeys();
});

const openCreateDialog = () => {
    isEditing.value = false;
    editingId.value = null;
    newKey.value = { title: '', value: '', alias: '' };
    showDialog.value = true;
};

const openEditDialog = (key) => {
    isEditing.value = true;
    editingId.value = key.id;
    newKey.value = { 
        title: key.title, 
        value: key.value, 
        alias: key.alias || '' 
    };
    showDialog.value = true;
};

const handleSave = async () => {
    if (!newKey.value.title || !newKey.value.value) return;
    creating.value = true;
    try {
        if (isEditing.value) {
            await sshStore.updateKey(editingId.value, {
                ...newKey.value
            });
        } else {
            await sshStore.addKey({
                ...newKey.value,
                envId: envStore.currentEnvId
            });
        }
        showDialog.value = false;
        newKey.value = { title: '', value: '', alias: '' };
    } catch (e) {
        alert('Error saving key');
    } finally {
        creating.value = false;
    }
};

const handleDelete = async (id) => {
    if (confirm('Delete this key?')) {
        await sshStore.deleteKey(id);
    }
};

const copyString = (str) => {
    navigator.clipboard.writeText(str);
};

const runTest = async (key) => {
    testingId.value = key.id;

    let privateKeyContent = null;
    const shouldAuth = confirm("Dorești să testezi și autentificarea completă?\n(Va trebui să introduci conținutul cheii private)");
    
    if (shouldAuth) {
        privateKeyContent = prompt("Lipește aici conținutul cheii private (începe cu -----BEGIN...):");
        if (!privateKeyContent) {
             alert("Test anulat: Cheia privată este necesară pentru autentificare.");
             testingId.value = null;
             return;
        }
    }

    const result = await sshStore.testConnection(key.value, privateKeyContent);
    
    key.lastStatus = result.status; 
    key.lastPort = result.port;
    key.lastMessage = result.message; 
    
    if (result.status === 'open' && result.message.includes('Auth Successful')) {
        alert("Succes: Autentificarea SSH a reușit!");
    } else if (result.status === 'open') {
        alert("Info: Serverul este online, dar autentificarea nu a fost testată sau a eșuat parțial.");
    } else {
        alert("Eroare: " + result.message);
    }

    testingId.value = null;
}

const getConnectionColor = (status) => {
    if (status === 'open') return 'success';
    if (status === 'timeout' || status === 'error') return 'error';
    return 'grey';
}

const getConnectionText = (key) => {
    const port = key.lastPort || '?'; 
    const status = key.lastStatus;

    if (status === 'open') return `Online (Port ${port})`;
    if (status === 'timeout') return `Timeout (Port ${port})`;
    if (status === 'error') return `Connection Failed (Port ${port})`;
    return 'Test Connectivity';
}

const installCommand = computed(() => {
    if (!generatedConfig.value) return '';
    return `printf "\\n${generatedConfig.value.replace(/\n/g, '\\n')}" >> ~/.ssh/config`;
});

const copyInstallCommand = () => {
    navigator.clipboard.writeText(installCommand.value);
    alert("Command copied!");
}


const openConfigGenerator = (key) => {
    const rawString = key.value; 
    
    const hostAlias = key.alias || key.title.toLowerCase().replace(/[^a-z0-9]/g, '-');

    let hostName = '';
    let user = '';
    let port = '';
    let identityFile = '';

    const parts = rawString.trim().split(/\s+/);

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part === 'ssh') continue;

        if (part === '-p') {
            if (i + 1 < parts.length) {
                port = parts[i + 1];
                i++; 
            }
            continue;
        }

        if (part === '-i') {
            if (i + 1 < parts.length) {
                identityFile = parts[i + 1];
                i++; 
            }
            continue;
        }

        if (part === '-o') {
            if (i + 1 < parts.length) i++;
            continue;
        }

        if (part.startsWith('-')) continue;

        if (!hostName) {
            if (part.includes('@')) {
                const [u, h] = part.split('@');
                user = u;
                hostName = h;
            } else {
                hostName = part;
            }
        }
    }

    let configBlock = `Host ${hostAlias}\n`;
    if (hostName) configBlock += `    HostName ${hostName}\n`;
    if (user) configBlock += `    User ${user}\n`;
    if (port) configBlock += `    Port ${port}\n`;
    if (identityFile) configBlock += `    IdentityFile ${identityFile}\n`;
    else configBlock += `    # IdentityFile ~/.ssh/id_rsa\n`;

    generatedConfig.value = configBlock;
    showConfigDialog.value = true;
}

const copyConfig = () => {
    navigator.clipboard.writeText(generatedConfig.value);
    alert("Config copied!");
    showConfigDialog.value = false;
}
</script>

<template>
    <div class="pa-4">
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h1 class="text-h4 font-weight-bold text-primary">SSH Keys Manager</h1>
                <span class="text-subtitle-1 text-grey" v-if="envStore.currentEnvironment">
                    Environment: {{ envStore.currentEnvironment.name }}
                </span>
                <span class="text-subtitle-1 text-red" v-else>
                    Please select an environment from the sidebar.
                </span>
            </div>
            <v-btn 
                prepend-icon="mdi-plus" 
                color="primary" 
                @click="openCreateDialog"
                :disabled="!envStore.currentEnvId"
            >
                Add SSH Key
            </v-btn>
        </div>

        <v-row>
            <v-col cols="12" v-if="sshStore.loading">
                <v-progress-linear indeterminate color="primary"></v-progress-linear>
            </v-col>

            <v-col cols="12" v-else-if="sshStore.keys.length === 0">
                <v-sheet 
                    border="dashed" 
                    class="d-flex flex-column align-center justify-center py-10 rounded bg-grey-lighten-5"
                >
                    <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-key-variant-off</v-icon>
                    <div class="text-body-1 text-grey-darken-1">No SSH keys found for this environment.</div>
                    <div class="text-caption text-grey">Add SSH keys to manage secure connections.</div>
                    <v-btn 
                        variant="text" 
                        color="primary" 
                        class="mt-2"
                        @click="openCreateDialog"
                        :disabled="!envStore.currentEnvId"
                    >
                        Add First SSH Key
                    </v-btn>
                </v-sheet>
            </v-col>

            <v-col cols="12" md="6" lg="4" v-for="key in sshStore.keys" :key="key.id">
                <v-card border elevation="1">
                    <v-card-title class="d-flex justify-space-between align-center">
                        <div class="text-truncate" style="max-width: 70%;">
                            <v-icon icon="mdi-console-line" size="small" class="mr-2"></v-icon>
                            {{ key.title }}
                            <div v-if="key.alias" class="text-caption text-grey">Alias: {{ key.alias }}</div>
                        </div>
                        <v-chip size="x-small" :color="getConnectionColor(key.lastStatus)" variant="flat">
                            {{ getConnectionText(key) }}
                        </v-chip>
                    </v-card-title>
                    
                    <v-card-text class="py-2">
                        <div class="d-flex align-center bg-grey-lighten-4 pa-2 rounded">
                            <code class="text-caption text-truncate flex-grow-1" style="max-width: 100%;">
                                {{ key.value }}
                            </code>
                            <v-btn 
                                icon="mdi-content-copy" 
                                size="x-small" 
                                variant="text" 
                                color="grey-darken-1"
                                class="ml-2"
                                @click="copyString(key.value)"
                                title="Copy connection string"
                            ></v-btn>
                        </div>
                    </v-card-text>

                    <v-divider></v-divider>

                    <v-card-actions>
                        <v-btn 
                            size="small" 
                            variant="text" 
                            color="primary" 
                            prepend-icon="mdi-play"
                            @click="runTest(key)"
                            :loading="testingId === key.id"
                        >
                            Test
                        </v-btn>
                        
                        <v-btn 
                            size="small" 
                            variant="text" 
                            color="secondary"
                            prepend-icon="mdi-file-cog"
                            @click="openConfigGenerator(key)"
                        >
                            Config
                        </v-btn>

                        <v-spacer></v-spacer>

                        <v-btn 
                            size="small" 
                            variant="text" 
                            color="blue" 
                            icon="mdi-pencil"
                            @click="openEditDialog(key)"
                        ></v-btn>

                        <v-btn 
                            size="small" 
                            variant="text" 
                            color="red" 
                            icon="mdi-delete"
                            @click="handleDelete(key.id)"
                        ></v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>

        <v-dialog v-model="showDialog" max-width="500">
            <v-card>
                <v-card-title>{{ isEditing ? 'Edit SSH Connection' : 'Add SSH Connection' }}</v-card-title>
                <v-card-text>
                    <v-text-field
                        v-model="newKey.title"
                        label="Title (e.g. Web Server Prod)"
                        variant="outlined"
                        class="mb-2"
                    ></v-text-field>

                    <v-text-field
                        v-model="newKey.alias"
                        label="Alias (Optional short name)"
                        placeholder="e.g. web-prod"
                        variant="outlined"
                        density="compact"
                        hint="Used for generating SSH Config Host"
                        class="mb-2"
                    ></v-text-field>
                    
                    <v-textarea
                        v-model="newKey.value"
                        label="Connection String"
                        placeholder="ssh -i ~/.ssh/id_rsa user@192.168.1.1"
                        variant="outlined"
                        rows="3"
                        hint="Paste your full SSH command here"
                        persistent-hint
                    ></v-textarea>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
                    <v-btn 
                        color="primary" 
                        @click="handleSave" 
                        :loading="creating"
                        :disabled="!newKey.title || !newKey.value"
                    >
                        {{ isEditing ? 'Update' : 'Save' }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showConfigDialog" max-width="700">
            <v-card>
                <v-card-title class="bg-grey-darken-3 text-white d-flex align-center">
                    <v-icon icon="mdi-console" class="mr-2"></v-icon>
                    SSH Config Helper
                </v-card-title>

                <v-tabs v-model="activeTab" bg-color="grey-lighten-2">
                    <v-tab value="preview">Preview File</v-tab>
                    <v-tab value="command">One-Liner Install</v-tab>
                </v-tabs>

                <v-card-text class="pt-4">
                    <v-window v-model="activeTab">
                        <v-window-item value="preview">
                            <p class="mb-2 text-body-2">Copy this block into <code>~/.ssh/config</code>:</p>
                            <v-textarea
                                v-model="generatedConfig"
                                readonly
                                variant="outlined"
                                bg-color="grey-lighten-5"
                                class="font-monospace"
                                rows="6"
                                hide-details
                            ></v-textarea>
                            <v-btn 
                                block 
                                color="secondary" 
                                variant="tonal" 
                                class="mt-2" 
                                prepend-icon="mdi-content-copy" 
                                @click="copyConfig"
                            >
                                Copy Config Text
                            </v-btn>
                        </v-window-item>

                        <v-window-item value="command">
                            <v-alert type="info" variant="tonal" density="compact" class="mb-2">
                                Run this command in your terminal to automatically append this host to your config.
                            </v-alert>
                            <div class="bg-black pa-3 rounded font-monospace text-caption mb-2">
                                {{ installCommand }}
                            </div>
                            <v-btn 
                                block 
                                color="primary" 
                                prepend-icon="mdi-terminal" 
                                @click="copyInstallCommand"
                            >
                                Copy Terminal Command
                            </v-btn>
                        </v-window-item>
                    </v-window>
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="showConfigDialog = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.font-monospace :deep(textarea) {
    font-family: monospace !important;
}
</style>