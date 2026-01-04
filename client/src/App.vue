<script setup>
import { ref } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const drawer = ref(true);
const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
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

    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon v-if="authStore.user" @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>Environment Manager</v-app-bar-title>
    </v-app-bar>

      <v-main>
      <v-container fluid>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>