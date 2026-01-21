<script setup>
import { ref, computed } from 'vue'
import { useEnvironmentStore } from '@/stores/environments'

const envStore = useEnvironmentStore()

const showAddLinkDialog = ref(false)
const newLink = ref({
  title: '',
  url: '',
  description: ''
})
const addingLink = ref(false)

const quickLinks = computed(() => {
  return envStore.currentEnvironment?.quickLinks || []
})

const handleAddLink = async () => {
  if (!newLink.value.title || !newLink.value.url) return
  
  let formattedUrl = newLink.value.url
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl
  }

  addingLink.value = true
  try {
    await envStore.addQuickLink(envStore.currentEnvId, {
      title: newLink.value.title,
      url: formattedUrl,
      description: newLink.value.description
    })
    showAddLinkDialog.value = false
    newLink.value = { title: '', url: '', description: '' }
  } catch (e) {
    alert('Failed to add link' + e)
  } finally {
    addingLink.value = false
  }
}

const handleDeleteLink = async (index) => {
  if (confirm('Delete this bookmark?')) {
    await envStore.removeQuickLink(envStore.currentEnvId, index)
  }
}

const openLink = (url) => {
  window.open(url, '_blank')
}

const getIcon = (title) => {
  const t = title.toLowerCase()
  if (t.includes('git')) return 'mdi-git'
  if (t.includes('jenkins') || t.includes('build')) return 'mdi-hammer-wrench'
  if (t.includes('grafana') || t.includes('kibana') || t.includes('log')) return 'mdi-chart-box'
  if (t.includes('db') || t.includes('admin') || t.includes('sql')) return 'mdi-database'
  return 'mdi-web'
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
          <span class="text-subtitle-1 text-grey">Dashboard & Quick Links</span>
        </div>
        <v-btn 
          prepend-icon="mdi-plus" 
          color="primary" 
          variant="flat"
          @click="showAddLinkDialog = true"
        >
          Add Bookmark
        </v-btn>
      </div>

      <v-row>
        <v-col cols="12" sm="6" md="4" lg="3" v-for="(link, index) in quickLinks" :key="index">
          <v-card 
            class="h-100 d-flex flex-column hover-card" 
            elevation="2"
            @click="openLink(link.url)"
            border
          >
            <v-card-item>
              <template v-slot:prepend>
                <v-avatar color="primary" variant="tonal" rounded>
                  <v-icon :icon="getIcon(link.title)"></v-icon>
                </v-avatar>
              </template>
              <v-card-title>{{ link.title }}</v-card-title>
              <v-card-subtitle v-if="link.description">{{ link.description }}</v-card-subtitle>
              <v-card-subtitle v-else class="text-truncate">{{ link.url }}</v-card-subtitle>
              
              <template v-slot:append>
                <v-btn 
                  icon="mdi-delete" 
                  variant="text" 
                  size="small" 
                  color="grey"
                  @click.stop="handleDeleteLink(index)"
                ></v-btn>
              </template>
            </v-card-item>
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
              @click="showAddLinkDialog = true"
            >
              Add First Link
            </v-btn>
          </v-sheet>
        </v-col>
      </v-row>
    </div>

    <v-dialog v-model="showAddLinkDialog" max-width="500">
      <v-card>
        <v-card-title>Add Quick Link</v-card-title>
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
            label="URL (e.g. https://kibana...)"
            variant="outlined"
            prepend-inner-icon="mdi-link"
            hint="Don't worry about http://, we'll add it if missing."
          ></v-text-field>

          <v-text-field
            v-model="newLink.description"
            label="Description (Optional)"
            variant="outlined"
            prepend-inner-icon="mdi-text"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddLinkDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="handleAddLink" 
            :loading="addingLink"
            :disabled="!newLink.title || !newLink.url"
          >
            Add Link
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
</style>