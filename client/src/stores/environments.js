import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { auth } from '../firebase'; 

export const useEnvironmentStore = defineStore('environments', () => {
  const environments = ref([]) 
  const currentEnvId = ref(localStorage.getItem('currentEnvId') || null);
  const loading = ref(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const currentEnvironment = computed(() => 
    environments.value.find(env => env.id === currentEnvId.value)
  )

  const getAuthHeaders = async () => {
      if (!auth.currentUser) throw new Error("User not logged in");
      const token = await auth.currentUser.getIdToken();
      return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      };
  };

  async function fetchEnvironments() {
    if (!auth.currentUser) return; 
    loading.value = true;

    try{
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/environments`, { headers });
      
      if(!res.ok) throw new Error("Failed to fetch environments");

      environments.value = await res.json();

      if (!currentEnvId.value && environments.value.length > 0) {
        selectEnvironment(environments.value[0].id)
      } else if(currentEnvId.value && !environments.value.find(env => env.id == currentEnvId.value)){
        if (environments.value.length > 0) selectEnvironment(environments.value[0].id)
        else selectEnvironment(null)
      }

    } catch(error){
      console.error("Error trying to fetch envs: ", error);
    } finally {
      loading.value = false
    }
  }

  async function addEnvironment(name) {
    try{
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/environments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name })
      });

      if(!res.ok) throw new Error("Failed to create env");

      const newEnv = await res.json();
      environments.value.push(newEnv);
      selectEnvironment(newEnv.id)
      
      return newEnv.id
    } catch(e){
      console.error("Error trying to create new env: ", e);
      throw e;
    }
  }

  async function deleteEnvironment(id) {
    if(!confirm("Are you sure you want to delete this?")) return;

    try{
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/environments/${id}`, {
          method: 'DELETE',
          headers
      });

      if(!res.ok) throw new Error("Failed to delete env");

      environments.value = environments.value.filter(e => e.id !== id);

      if (currentEnvId.value === id) {
        if (environments.value.length > 0) {
          selectEnvironment(environments.value[0].id);
        } else {
          selectEnvironment(null);
        }
      }
    } catch (e) {
      console.error("Error deleting env:", e);
      throw e;
    }
  }

  async function updateEnvironment(id, data) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/environments/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        });

        if(!res.ok) throw new Error("Failed to update env");

        const env = environments.value.find(e => e.id === id);
        if (env){
          Object.assign(env, data);
        }
      } catch (e) {
        console.error("Error updating env:", e);
        throw e;
      }
  }

  function selectEnvironment(id){
    currentEnvId.value = id;
    if (id) {
        localStorage.setItem('currentEnvId', id);
    } else {
        localStorage.removeItem('currentEnvId');
    }
  }

  async function addQuickLink(envId, linkData){
    const env = environments.value.find(e => e.id == envId);
    if(!env) return;

    const currentLinks = env.quickLinks ? [...env.quickLinks] : [];
    currentLinks.push(linkData);
    
    await updateEnvironment(envId, { quickLinks: currentLinks });
  }

  async function updateQuickLink(envId, index, linkData) {
    const env = environments.value.find(e => e.id == envId);
    if(!env || !env.quickLinks) return;

    const currentLinks = [...env.quickLinks];
    if(index >= 0 && index < currentLinks.length) {
        currentLinks[index] = linkData;
        await updateEnvironment(envId, { quickLinks: currentLinks });
    }
  }

  async function removeQuickLink(envId, linkIndex) {
    const env = environments.value.find(e => e.id === envId);
    if (!env || !env.quickLinks) return;

    const currentLinks = [...env.quickLinks];
    currentLinks.splice(linkIndex, 1);

    await updateEnvironment(envId, { quickLinks: currentLinks });
  }

  async function checkLinkStatus(url) {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/status/check`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ url })
        });
        
        if (!res.ok) return { status: 'unknown' };
        
        return await res.json();
    } catch (e) {
        console.error("Status check failed:", e);
        return { status: 'error' };
    }
  }

  return { 
    environments, 
    currentEnvId, 
    currentEnvironment, 
    loading, 
    fetchEnvironments, 
    addEnvironment, 
    deleteEnvironment,
    updateEnvironment,
    selectEnvironment,
    addQuickLink,
    updateQuickLink,
    removeQuickLink,
    checkLinkStatus
  };
});