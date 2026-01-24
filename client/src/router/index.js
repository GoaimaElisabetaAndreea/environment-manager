import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import DashboardView from '../views/DashboardView.vue'
import SshKeyManagerView from '../views/SshKeyManagerView.vue'
import SecretCreateView from '../views/SecretCreateView.vue'
import SecretReadView from '../views/SecretReadView.vue'
import CommandBuilderView from '../views/CommandBuilderView.vue'
import WikiView from '../views/WikiView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { 
      path: '/', 
      name: 'dashboard', 
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    { 
      path: '/ssh-keys', 
      name: 'ssh-keys', 
      component: SshKeyManagerView,
      meta: { requiresAuth: true }
    },
    { 
      path: '/commands', 
      name: 'commands', 
      component: CommandBuilderView,
      meta: { requiresAuth: true }
    },
    { 
      path: '/secrets', 
      name: 'secrets', 
      component: SecretCreateView,
      meta: { requiresAuth: true }
    },
    {
      path: '/wiki',
      name: 'wiki',
      component: WikiView,
      meta: { requiresAuth: true }
    },
    { 
      path: '/s/:id', 
      name: 'secret-read', 
      component: SecretReadView 
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.user && authStore.loading) {
     await new Promise(resolve => {
       const unwatch = authStore.$subscribe((mutation, state) => {
         if (!state.loading) {
           unwatch()
           resolve()
         }
       })
     })
  }

  if (to.meta.requiresAuth && !authStore.user) {
    next('/login')
  } else if ((to.name === 'login' || to.name === 'register') && authStore.user) {
    next('/')
  } else {
    next()
  }
})

export default router