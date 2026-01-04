<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEnvironmentStore } from '@/stores/environments' 
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'

const drawer = ref(true)
const showAddEnvDialog = ref(false)
const newEnvName = ref('')
const creatingEnv = ref(false)

const showEditEnvDialog = ref(false)
const editEnvName = ref('')
const editEnvId = ref(null)
const updatingEnv = ref(false)

const authStore = useAuthStore()
const envStore = useEnvironmentStore()
const router = useRouter()

onMounted(async () => {

  onAuthStateChanged(auth, async(user) =>{
    if(user){
      authStore.user = user;

      await envStore.fetchEnvironments();

      if(router.currentRoute.value.path === '/login'){
        router.push('/dashboard');
      } 
    } else {
      authStore.user = null
      if (router.currentRoute.value.path !== '/login' && router.currentRoute.value.path !== '/register') {
        router.push('/login')
      }
    }
  })
})

watch(() => authStore.user, async (newUser) => {
  if (newUser) {
    await envStore.fetchEnvironments()
  }
})

const handleCreateEnv = async () => {
  if (!newEnvName.value) return
  creatingEnv.value = true
  try {
    await envStore.addEnvironment(newEnvName.value)
    showAddEnvDialog.value = false
    newEnvName.value = ''
  } catch (e) {
    alert('Eroare la creare mediu')
  } finally {
    creatingEnv.value = false
  }
}

const handleUpdateEnv = async () => {
  if(!editEnvName.value) return;

  updatingEnv.value = true;

  try{
    await envStore.updateEnvironment(editEnvId.value, editEnvName.value);
    showEditEnvDialog.value = false;
  }catch (e) {
    alert('Error!')
  } finally {
    updatingEnv.value = false
  }
}

const handleDeleteEnv = async(id) => {
  await envStore.deleteEnvironment(id);
}

const openEditDialog = (env) => {
  editEnvId.value = env.id
  editEnvName.value = env.name
  showEditEnvDialog.value = true
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const menuItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { title: 'Share Secret', icon: 'mdi-lock-plus', to: '/secrets/create' },
]
</script>

<template>
  <v-app>
    <v-navigation-drawer v-if="authStore.user" v-model="drawer" permanent>
      
      <v-list>
        <v-list-item
          prepend-avatar="https://randomuser.me/api/portraits/lego/1.jpg"
          :title="authStore.user?.email || 'User'"
          subtitle="Logged In"
        ></v-list-item>
      </v-list>

      <v-divider class="mb-2"></v-divider>

      <div class="px-2 mb-2">
        <v-label class="text-caption ml-2 mb-1">Current Environment</v-label>
        
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              block
              variant="tonal"
              color="light-blue-darken-4"
              class="justify-space-between text-none"
              append-icon="mdi-chevron-down"
              v-bind="props"
            >
              {{ envStore.currentEnvironment?.name || 'Select Env' }}
            </v-btn>
          </template>
          
          <v-list>
            <v-list-item
              v-for="env in envStore.environments"
              :key="env.id"
              :value="env.id"
              @click="envStore.selectEnvironment(env.id)"
              :active="env.id === envStore.currentEnvId"
              color="primary"
            >
              <v-list-item-title>{{ env.name }}</v-list-item-title>

              <template v-slot:append>
                <div class="d-flex">
                  <v-btn 
                    icon="mdi-pencil" 
                    size="x-small" 
                    variant="text" 
                    color="grey"
                    @click.stop="openEditDialog(env)" 
                  ></v-btn>
                  
                  <v-btn 
                    icon="mdi-delete" 
                    size="x-small" 
                    variant="text" 
                    color="red-lighten-2"
                    @click.stop="handleDeleteEnv(env.id)"
                  ></v-btn>
                </div>
              </template>
            </v-list-item>

            <v-divider></v-divider>

            <v-list-item @click="showAddEnvDialog = true">
              <template v-slot:prepend>
                <v-icon icon="mdi-plus" color="light-blue-darken-4" class="font-weight-bold"></v-icon>
              </template>
              <v-list-item-title class="text-light-blue-darken-4 font-weight-bold">New Environment</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          link
        ></v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="pa-2">
          <v-btn block color="red" @click="handleLogout">
            Logout
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-dialog v-model="showAddEnvDialog" max-width="400">
      <v-card>
        <v-card-title>Create New Environment</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newEnvName"
            label="Environment Name"
            placeholder="e.g. Production, Staging"
            variant="outlined"
            autofocus
            @keyup.enter="handleCreateEnv"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddEnvDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="handleCreateEnv" :loading="creatingEnv">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEditEnvDialog" max-width="400">
      <v-card>
        <v-card-title>Rename Environment</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editEnvName"
            label="Environment Name"
            variant="outlined"
            autofocus
            @keyup.enter="handleUpdateEnv"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showEditEnvDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="handleUpdateEnv" :loading="updatingEnv">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon v-if="authStore.user" @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>
        Environment Manager 
        <span v-if="envStore.currentEnvironment" class="text-subtitle-2 ml-2 text-grey-lighten-2">
          / {{ envStore.currentEnvironment.name }}
        </span>
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>