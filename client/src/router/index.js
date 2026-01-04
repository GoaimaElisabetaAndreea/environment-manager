import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import SecretCreateView from '../views/SecretCreateView.vue' 
import SecretReadView from '../views/SecretReadView.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    },
    { 
      path: '/secrets/create', 
      name: 'create-secret', 
      component: SecretCreateView 
    },
    { 
      path: '/secrets/view/:id', 
      name: 'view-secret', 
      component: SecretReadView 
    },


  ]
});

export default router;