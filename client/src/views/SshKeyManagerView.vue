<script setup>
import { ref, onMounted, watch } from 'vue';
import { useSshKeyStore } from '@/stores/sshKeys';
import { useEnvironmentStore } from '@/stores/environments';
import { useAuthStore } from '@/stores/auth'; 

const sshStore = useSshKeyStore();
const envStore = useEnvironmentStore();
const authStore = useAuthStore(); 

const showDialog = ref(false);
const newKey = ref({ title: '', value: '' });
const creating = ref(false);
const activeTab = ref('preview');

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

const testingId = ref(null);

const runTest = async (key) => {
    testingId.value = key.id;
    const result = await sshStore.testConnection(key.value);
    
    key.lastStatus = result.status; 
    testingId.value = null;
}

const getConnectionColor = (status) => {
    if (status === 'open') return 'success';
    if (status === 'timeout' || status === 'error') return 'error';
    return 'grey';
}

const getConnectionText = (status) => {
    if (status === 'open') return 'Online (Port 22)';
    if (status === 'timeout') return 'Timeout';
    if (status === 'error') return 'Connection Failed';
    return 'Test Connectivity';
}

const installCommand = computed(() => {
    if (!generatedConfig.value) return '';
    return `printf "\\n${generatedConfig.value.replace(/\n/g, '\\n')}" >> ~/.ssh/config`;
});

const copyInstallCommand = () => {
    navigator.clipboard.writeText(installCommand.value);
    alert("Command copied! Paste it in your terminal to append to config.");
}

const openConfigGenerator = (key) => {
    const rawString = key.value; 
    
    const hostAlias = key.title.toLowerCase().replace(/[^a-z0-9]/g, '-');

    let hostName = '';
    let user = '';
    let port = '';
    let identityFile = '';

    const parts = rawString.split(' ');

    const connectionPart = parts.find(p => !p.startsWith('-') && (p.includes('@') || p.includes('.')));
    if (connectionPart) {
        if (connectionPart.includes('@')) {
            [user, hostName] = connectionPart.split('@');
        } else {
            hostName = connectionPart;
        }
    }

    const portIndex = parts.indexOf('-p');
    if (portIndex !== -1 && parts[portIndex+1]) port = parts[portIndex+1];

    const idIndex = parts.indexOf('-i');
    if (idIndex !== -1 && parts[idIndex+1]) identityFile = parts[idIndex+1];

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
    alert("Config copied! Paste it into ~/.ssh/config");
    showConfigDialog.value = false;
}
</script>


<template>
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
</template>