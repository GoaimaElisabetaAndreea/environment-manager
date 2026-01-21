<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useCommandStore } from '@/stores/commands'
import { useEnvironmentStore } from '@/stores/environments'
import curlFlags from '@/assets/curl-flags.json'

const commandStore = useCommandStore();
const envStore = useEnvironmentStore();

const showCreateDialog = ref(false);
const selectedCommand = ref(null);
const inputValues = ref({});
const selectedFlags = ref([]);

const showSuggestions = ref(false);
const suggestionFilter = ref('');
const cursorIndex = ref(0);

const availableVariables = computed(() => {
  if (!envStore.currentEnvironment?.variables) return [];
  return Object.keys(envStore.currentEnvironment.variables);
});

const filteredSuggestions = computed(() => {
  if (!suggestionFilter.value) return availableVariables.value;
  return availableVariables.value.filter(v => 
    v.toLowerCase().includes(suggestionFilter.value.toLowerCase())
  );
});

const handleInput = (event) => {
  const text = newCommand.value.template || '';
  
  let cursor = 0;
  if (event.target && typeof event.target.selectionStart === 'number') {
    cursor = event.target.selectionStart;
  }
  
  cursorIndex.value = cursor;

  const lastOpenBrace = text.lastIndexOf('{{', cursor - 1);
  
  if (lastOpenBrace !== -1) {
    const closingBrace = text.indexOf('}}', lastOpenBrace);
    
    if (closingBrace === -1 || closingBrace >= cursor) {
      showSuggestions.value = true;
      suggestionFilter.value = text.substring(lastOpenBrace + 2, cursor);
    } else {
      showSuggestions.value = false;
    }
  } else {
    showSuggestions.value = false;
  }
};

const insertVariable = (variableName) => {
  const text = newCommand.value.template;
  const cursor = cursorIndex.value;
  
  const lastOpenBrace = text.lastIndexOf('{{', cursor - 1);
  
  if (lastOpenBrace !== -1) {
    const before = text.substring(0, lastOpenBrace);
    const after = text.substring(cursor);
    
    const newText = `${before}{{${variableName}}}${after}`;
    newCommand.value.template = newText;
    
    showSuggestions.value = false;
    suggestionFilter.value = '';

    nextTick(() => {
      const textarea = document.getElementById('template-input');
      if(textarea) {
        textarea.focus();
        const newCursorPos = lastOpenBrace + 2 + variableName.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }
};

const commonFlags = curlFlags.length > 0 ? curlFlags : [
  { label: 'Include Headers (-i)', value: '-i' },
  { label: 'Verbose (-v)', value: '-v' },
  { label: 'Insecure (-k)', value: '-k' },
  { label: 'Follow Redirects (-L)', value: '-L' },
  { label: 'Silent (-s)', value: '-s' }
];

const newCommand = ref({
  title: '',
  description: '',
  template: 'curl -X POST https://api.example.com/users/{{userId}}/reset-password',
  flags: []
});

onMounted(() => {
  commandStore.fetchCommands();
})

watch(() => envStore.currentEnvId, () => {
  selectedCommand.value = null;
  commandStore.fetchCommands();
})

const detectedVariables = computed(() => {
  if (!selectedCommand.value) return [];

  const matches = selectedCommand.value.template.match(/\{\{(.*?)\}\}/g);
  if (!matches) return [];
  const allVars = [...new Set(matches.map(v => v.replace(/{{|}}/g, '').trim()))];

  return allVars.filter(variable => {
    const envVars = envStore.currentEnvironment?.variables || {}
    return !envVars[variable]
  })
})

const finalCommand = computed(() => {
  if (!selectedCommand.value) return '';
  let cmd = selectedCommand.value.template;
  
  const matches = selectedCommand.value.template.match(/\{\{(.*?)\}\}/g) || []
  const allVars = [...new Set(matches.map(v => v.replace(/{{|}}/g, '').trim()))]

  allVars.forEach(variable => {
    const envVal = envStore.currentEnvironment?.variables?.[variable];
    const userVal = inputValues.value[variable];

    const finalVal = userVal || envVal || `{{${variable}}}`;

    cmd = cmd.replaceAll(`{{${variable}}}`, finalVal);
  })

  if(selectedFlags.value.length > 0){
    cmd += ' ' + selectedFlags.value.join(' ');
  }

  return cmd;
})

const handleCreate = async () => {
  if (!newCommand.value.title || !newCommand.value.template) return;
 
  await commandStore.addCommand({ ...newCommand.value });
  showCreateDialog.value = false;
  newCommand.value = { title: '', description: '', template: '', flags:[] };
}

const selectCmd = (cmd) => {
  selectedCommand.value = cmd;
  inputValues.value = {}; 
  selectedFlags.value = cmd.flags || [];
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(finalCommand.value);
  alert('Copied!');
}

const handleDelete = async (id) => {
  if(confirm('Are you sure you want to delete this?')) {
    await commandStore.deleteCommand(id);
    if (selectedCommand.value?.id === id) selectedCommand.value = null
  }
}

const preview = computed( () => {
  let cmd = newCommand.value.template || '';

  const matches = cmd.match(/\{\{(.*?)\}\}/g)

  if(newCommand.flags.length > 0){
    
  }
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="4">
        <div class="d-flex justify-space-between align-center mb-4">
          <h2 class="text-h6">Command Templates</h2>
          <v-btn size="small" color="primary" icon="mdi-plus" @click="showCreateDialog = true"></v-btn>
        </div>

        <v-alert v-if="!envStore.currentEnvId" type="warning" density="compact" class="mb-4">
          Select an environment
        </v-alert>

        <v-list v-else lines="two" class="bg-grey-darken-4 rounded elevation-2">
          <v-list-item
            v-for="cmd in commandStore.commands"
            :key="cmd.id"
            :title="cmd.title"
            :subtitle="cmd.description"
            :active="selectedCommand?.id === cmd.id"
            @click="selectCmd(cmd)"
            rounded
            class="mb-1"
          >
            <template v-slot:append>
              <v-btn icon="mdi-delete" size="x-small" variant="text" color="red" @click.stop="handleDelete(cmd.id)"></v-btn>
            </template>
          </v-list-item>
          <div v-if="commandStore.commands.length === 0" class="pa-4 text-center text-grey">
            No templates in {{ envStore.currentEnvironment?.name }}
          </div>
        </v-list>
      </v-col>

      <v-col cols="12" md="8">
        <v-card v-if="selectedCommand" class="elevation-4">
          <v-card-title class="bg-primary text-white">
            Builder: {{ selectedCommand.title }}
          </v-card-title>
          
          <v-card-text class="pt-4">
            <v-row v-if="detectedVariables.length > 0">
              <v-col cols="12"><strong>Fill in the variables</strong></v-col>
              <v-col 
                v-for="variable in detectedVariables" 
                :key="variable" 
                cols="12" md="6"
              >
                <v-text-field
                  v-model="inputValues[variable]"
                  :label="variable"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-text-field>
              </v-col>
            </v-row>
            <v-alert v-else type="info" variant="tonal" class="mb-4">
         This template does not have any variables (ex: <span v-pre>{{nume}}</span>).
            </v-alert>

            <v-divider class="my-4"></v-divider>
            <div class="mb-4">
                <v-autocomplete
                    v-model="selectedFlags"
                    :items="commonFlags"
                    item-title="label"
                    item-value="value"
                    label="Flags"
                    multiple
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    chips
                    closable-chips
                ></v-autocomplete>
            </div>
            <v-divider class="my-4"></v-divider>

            <div class="bg-black pa-4 rounded position-relative">
              <code class="text-green-accent-3" style="word-break: break-all;">
                {{ finalCommand }}
              </code>
              <v-btn 
                position="absolute" 
                location="top right" 
                icon="mdi-content-copy" 
                size="small" 
                class="mt-2 mr-2"
                @click="copyToClipboard"
              ></v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-sheet v-else class="d-flex align-center justify-center fill-height bg-transparent border-dashed rounded" min-height="300">
          <div class="text-center text-grey">
            <v-icon size="64" class="mb-2">mdi-console-line</v-icon>
            <p>Select a template or create one.</p>
          </div>
        </v-sheet>
      </v-col>
    </v-row>

    <v-dialog v-model="showCreateDialog" max-width="600">
      <v-card>
        <v-card-title>New Command Template</v-card-title>
        <v-card-text>
          <v-text-field v-model="newCommand.title" label="Title" variant="outlined"></v-text-field>
          <v-text-field v-model="newCommand.description" label="Description" variant="outlined"></v-text-field>
          
          <v-autocomplete
          v-model="newCommand.flags"
          :items="commonFlags"
          item-title="label"
          item-value="value"
          label="Flags"
          multiple
          chips
          closable-chips
          variant="outlined"
          density="compact"
          class="mt-2"
          ></v-autocomplete>

          <div class="position-relative mt-2">
            <v-textarea 
              id="template-input"
              v-model="newCommand.template" 
              label="Template" 
              variant="outlined"
              hint="Type {{ to trigger variable autocomplete."
              persistent-hint
              rows="4"
              class="font-monospace"
              @input="handleInput"
              @click="handleInput"
              @keyup="handleInput"
            ></v-textarea>

            <v-menu
              v-model="showSuggestions"
              activator="#template-input"
              :close-on-content-click="false"
              max-height="200"
              offset="5"
            >
              <v-card class="elevation-4">
                <v-list density="compact">
                  <v-list-subheader class="text-uppercase text-caption font-weight-bold">
                    Sugestii ({{filteredSuggestions.length}})
                  </v-list-subheader>
                  
                  <template v-if="filteredSuggestions.length > 0">
                    <v-list-item
                      v-for="item in filteredSuggestions"
                      :key="item"
                      :value="item"
                      @click="insertVariable(item)"
                      prepend-icon="mdi-variable"
                      color="primary"
                    >
                      <v-list-item-title>{{ item }}</v-list-item-title>
                      <v-list-item-subtitle class="text-caption">
                        {{ envStore.currentEnvironment?.variables[item]?.substring(0, 30) }}...
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                  
                  <v-list-item v-else>
                    <v-list-item-title class="text-grey text-caption font-italic">
                      No matching variables found
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>
          </div>

          <div class="mt-4 pa-3 bg-grey-lighten-4 rounded border" v-if="envStore.currentEnvId">
            <div class="text-caption text-grey-darken-2 mb-2 font-weight-bold d-flex align-center">
              <v-icon size="small" icon="mdi-information-outline" class="mr-1"></v-icon>
              Available Variables in {{ envStore.currentEnvironment?.name }}:
            </div>
            
            <div v-if="availableVariables.length > 0" class="d-flex flex-wrap" style="gap: 8px;">
                <v-chip 
                    v-for="key in availableVariables" 
                    :key="key"
                    size="x-small" 
                    variant="flat"
                    color="primary"
                    @click="insertVariable(key)"
                    class="font-weight-medium"
                >
                    {{ key }}
                </v-chip>
            </div>
            <div v-else class="text-caption text-grey font-italic">
                No variables defined in this environment settings.
            </div>
          </div>

        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="handleCreate">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.font-monospace :deep(textarea) {
  font-family: monospace;
}
</style>