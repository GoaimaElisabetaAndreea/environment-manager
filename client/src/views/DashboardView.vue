<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useEnvironmentStore } from '@/stores/environments'
import { useSnackbarStore } from '@/stores/snackbar';

const snackbar = useSnackbarStore();
const envStore = useEnvironmentStore()

const showAddLinkDialog = ref(false)
const isEditing = ref(false)
const editingIndex = ref(-1)

const newLink = ref({
  title: '',
  url: '',
  description: '',
  username: '',
  password: ''
})
const addingLink = ref(false)
const showPassword = ref(false)

const linkStatuses = ref({})
const checkingStatus = ref(false)

const quickLinks = computed(() => {
  return envStore.currentEnvironment?.quickLinks || []
})

const checkAllStatuses = async () => {
    if (!quickLinks.value.length) return;
    
    checkingStatus.value = true;
    
    const promises = quickLinks.value.map(async (link) => {
        if (!linkStatuses.value[link.url]) {
             linkStatuses.value[link.url] = { status: 'loading' };
        }
        
        const result = await envStore.checkLinkStatus(link.url);
        linkStatuses.value[link.url] = result;
    });

    await Promise.all(promises);
    checkingStatus.value = false;
}

watch(() => envStore.currentEnvId, () => {
    linkStatuses.value = {}; 
    checkAllStatuses();
});

onMounted(() => {
    if (envStore.currentEnvId) {
        checkAllStatuses();
    }
});

const openAddDialog = () => {
  isEditing.value = false;
  editingIndex.value = -1;
  newLink.value = { title: '', url: '', description: '', username: '', password: '' };
  showAddLinkDialog.value = true;
}

const openEditDialog = (link, index) => {
  isEditing.value = true;
  editingIndex.value = index;
  newLink.value = { ...link };
  showAddLinkDialog.value = true;
}

const handleSaveLink = async () => {
  if (!newLink.value.title || !newLink.value.url) return
  
  let formattedUrl = newLink.value.url
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl
  }

  const linkPayload = {
    title: newLink.value.title,
    url: formattedUrl,
    description: newLink.value.description,
    username: newLink.value.username,
    password: newLink.value.password
  };

  addingLink.value = true
  try {
    if (isEditing.value) {
      await envStore.updateQuickLink(envStore.currentEnvId, editingIndex.value, linkPayload)
    } else {
      await envStore.addQuickLink(envStore.currentEnvId, linkPayload)
    }
    
    showAddLinkDialog.value = false
    newLink.value = { title: '', url: '', description: '', username: '', password: '' }
    
    envStore.checkLinkStatus(formattedUrl).then(res => {
        linkStatuses.value[formattedUrl] = res;
    });

  } catch (e) {
    snackbar.showError('Failed to save link: ' + e)
  } finally {
    addingLink.value = false
  }
}

const handleDeleteLink = async (index) => {
  if (confirm('Delete this bookmark?')) {
    await envStore.removeQuickLink(envStore.currentEnvId, index)
  }
}

const handleCardClick = (link) => {
  if (link.password) {
    navigator.clipboard.writeText(link.password);
    snackbar.showInfo(`Password for ${link.title} copied to clipboard!`);
  } else {
    openLink(link.url);
  }
}

const openLink = (url) => {
  window.open(url, '_blank')
}

const copyUser = (user) => {
    navigator.clipboard.writeText(user);
    snackbar.showInfo('Username copied!');
}

const getIcon = (title) => {
  const t = title.toLowerCase()
  if (t.includes('git')) return 'mdi-git'
  if (t.includes('jenkins') || t.includes('build')) return 'mdi-hammer-wrench'
  if (t.includes('grafana') || t.includes('kibana') || t.includes('log')) return 'mdi-chart-box'
  if (t.includes('db') || t.includes('admin') || t.includes('sql')) return 'mdi-database'
  return 'mdi-web'
}

const getStatusColor = (url) => {
    const s = linkStatuses.value[url];
    if (!s) return 'grey-lighten-2'; 
    if (s.status === 'loading') return 'amber';
    if (s.status === 'up') return 'green-accent-3';
    return 'error';
}

const getStatusText = (url) => {
    const s = linkStatuses.value[url];
    if (!s) return 'Unknown';
    if (s.status === 'loading') return 'Checking...';
    if (s.status === 'up') return `UP (${s.latency}ms)`;
    if (s.status === 'timeout') return 'Timeout';
    return 'DOWN';
}
</script>

<template>
  <div class="pa-4">
    <div v-if="!envStore.currentEnvironment" class="text-center mt-10">
      <v-icon size="64" color="grey-lighten-1">mdi-server-network-off</v-icon>
      <h2 class="text-grey mt-4">No Environment Selected</h2>
      <p>Please select or create an environment from the sidebar.</p>
    </div>

    <div v-else>
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">
            {{ envStore.currentEnvironment.name }}
          </h1>
          <div class="d-flex align-center">
            <span class="text-subtitle-1 text-grey mr-3">Dashboard & Quick Links</span>
            
            <v-btn 
                size="x-small" 
                variant="text" 
                color="grey" 
                prepend-icon="mdi-refresh"
                :loading="checkingStatus"
                @click="checkAllStatuses"
            >
                Refresh Status
            </v-btn>
          </div>
        </div>
        <v-btn 
          prepend-icon="mdi-plus" 
          color="primary" 
          variant="flat"
          @click="openAddDialog"
        >
          Add Bookmark
        </v-btn>
      </div>

      <v-row>
        <v-col cols="12" sm="6" md="4" lg="3" v-for="(link, index) in quickLinks" :key="index">
          <v-card 
            class="h-100 d-flex flex-column hover-card position-relative" 
            elevation="2"
            @click="handleCardClick(link)"
            border
            :ripple="!!link.password"
          >
            <div class="status-indicator">
                <v-tooltip location="top">
                    <template v-slot:activator="{ props }">
                         <v-badge
                            v-bind="props"
                            dot
                            :color="getStatusColor(link.url)"
                            class="mr-2 mt-2"
                         ></v-badge>
                    </template>
                    <span>{{ getStatusText(link.url) }}</span>
                </v-tooltip>
            </div>

            <v-card-item>
              <template v-slot:prepend>
                <v-avatar color="primary" variant="tonal" rounded>
                  <v-icon :icon="getIcon(link.title)"></v-icon>
                </v-avatar>
              </template>
              
              <v-card-title class="pr-4">{{ link.title }}</v-card-title>
              
              <v-card-subtitle v-if="link.description" class="mb-2">
                {{ link.description }}
              </v-card-subtitle>
              
              <div v-if="link.username || link.password" class="mt-2 pt-2 border-t">
                <div v-if="link.username" class="d-flex align-center text-caption text-grey-darken-1 mb-1">
                    <v-icon size="small" start>mdi-account</v-icon> 
                    <span class="text-truncate" style="max-width: 120px;">{{ link.username }}</span>
                    <v-btn 
                        icon="mdi-content-copy" 
                        size="x-small" 
                        variant="text" 
                        class="ml-1"
                        title="Copy Username"
                        @click.stop="copyUser(link.username)"
                    ></v-btn>
                </div>
                <div v-if="link.password" class="d-flex align-center text-caption text-green">
                    <v-icon size="small" start>mdi-lock</v-icon> 
                    <span>Click card to copy pass</span>
                </div>
              </div>
              <v-card-subtitle v-else class="text-truncate mt-1 text-caption">
                  {{ link.url }}
              </v-card-subtitle>
            </v-card-item>

            <v-spacer></v-spacer>

            <v-card-actions>
              <v-btn 
                variant="text" 
                color="primary" 
                size="small" 
                prepend-icon="mdi-open-in-new"
                @click.stop="openLink(link.url)"
              >
                Open
              </v-btn>

              <v-spacer></v-spacer>
              
              <v-btn 
                icon="mdi-pencil" 
                variant="text" 
                size="small" 
                color="blue"
                @click.stop="openEditDialog(link, index)"
              ></v-btn>

              <v-btn 
                icon="mdi-delete" 
                variant="text" 
                size="small" 
                color="grey"
                @click.stop="handleDeleteLink(index)"
              ></v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12" v-if="quickLinks.length === 0">
          <v-sheet 
            border="dashed" 
            class="d-flex flex-column align-center justify-center py-10 rounded bg-grey-lighten-5"
          >
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-bookmark-off-outline</v-icon>
            <div class="text-body-1 text-grey-darken-1">No quick links added yet.</div>
            <div class="text-caption text-grey">Add links to Kibana, Jenkins, DBs for quick access.</div>
            <v-btn 
              variant="text" 
              color="primary" 
              class="mt-2"
              @click="openAddDialog"
            >
              Add First Link
            </v-btn>
          </v-sheet>
        </v-col>
      </v-row>
    </div>

    <v-dialog v-model="showAddLinkDialog" max-width="500">
      <v-card>
        <v-card-title>{{ isEditing ? 'Edit Bookmark' : 'Add Quick Link' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newLink.title"
            label="Title (e.g. Kibana Logs)"
            variant="outlined"
            prepend-inner-icon="mdi-format-title"
            autofocus
          ></v-text-field>
          
          <v-text-field
            v-model="newLink.url"
            label="URL"
            variant="outlined"
            prepend-inner-icon="mdi-link"
            hint="Include http:// or https://"
          ></v-text-field>

          <v-text-field
            v-model="newLink.description"
            label="Description (Optional)"
            variant="outlined"
            prepend-inner-icon="mdi-text"
          ></v-text-field>

          <v-row>
            <v-col cols="6">
                <v-text-field
                    v-model="newLink.username"
                    label="Username (Optional)"
                    variant="outlined"
                    prepend-inner-icon="mdi-account"
                    density="compact"
                ></v-text-field>
            </v-col>
            <v-col cols="6">
                <v-text-field
                    v-model="newLink.password"
                    label="Password (Optional)"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    prepend-inner-icon="mdi-lock"
                    :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    @click:append-inner="showPassword = !showPassword"
                    density="compact"
                ></v-text-field>
            </v-col>
          </v-row>

        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddLinkDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="handleSaveLink" 
            :loading="addingLink"
            :disabled="!newLink.title || !newLink.url"
          >
            {{ isEditing ? 'Update' : 'Add Link' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.hover-card {
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}
.status-indicator {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
}
</style>