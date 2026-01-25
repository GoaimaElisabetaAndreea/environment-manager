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
      console.error(error);
    } finally {
      loading.value = false
    }
  }

  async function addEnvironment(name) {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error("Environment name is required");
    }

    try{
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/environments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: name.trim() })
      });

      if(!res.ok) throw new Error("Failed to create env");

      const newEnv = await res.json();
      environments.value.push(newEnv);
      selectEnvironment(newEnv.id)
      
      return newEnv.id
    } catch(e){
      console.error(e);
      throw e;
    }
  }

  async function deleteEnvironment(id) {
    if (!id || typeof id !== 'string') throw new Error("Invalid Environment ID");

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
      console.error(e);
      throw e;
    }
  }

  async function updateEnvironment(id, data) {
      if (!id || typeof id !== 'string') throw new Error("Invalid Environment ID");
      if (!data || typeof data !== 'object') throw new Error("Invalid update data");

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
        console.error(e);
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
    if (!envId || typeof envId !== 'string') throw new Error("Invalid Environment ID");
    if (!linkData || typeof linkData !== 'object') throw new Error("Invalid link data");
    if (!linkData.title || !linkData.url) throw new Error("Link title and URL are required");

    const env = environments.value.find(e => e.id == envId);
    if(!env) throw new Error("Environment not found");

    const currentLinks = env.quickLinks ? [...env.quickLinks] : [];
    currentLinks.push({
        ...linkData,
        title: linkData.title.trim(),
        url: linkData.url.trim()
    });
    
    await updateEnvironment(envId, { quickLinks: currentLinks });
  }

  async function updateQuickLink(envId, index, linkData) {
    if (!envId || typeof envId !== 'string') throw new Error("Invalid Environment ID");
    if (typeof index !== 'number' || index < 0) throw new Error("Invalid link index");
    if (!linkData || typeof linkData !== 'object') throw new Error("Invalid link data");

    const env = environments.value.find(e => e.id == envId);
    if(!env || !env.quickLinks) throw new Error("Environment or links not found");

    const currentLinks = [...env.quickLinks];
    if(index >= currentLinks.length) throw new Error("Link index out of bounds");

    currentLinks[index] = {
        ...currentLinks[index],
        ...linkData,
        title: linkData.title ? linkData.title.trim() : currentLinks[index].title,
        url: linkData.url ? linkData.url.trim() : currentLinks[index].url
    };
    
    await updateEnvironment(envId, { quickLinks: currentLinks });
  }

  async function removeQuickLink(envId, linkIndex) {
    if (!envId || typeof envId !== 'string') throw new Error("Invalid Environment ID");
    if (typeof linkIndex !== 'number' || linkIndex < 0) throw new Error("Invalid link index");

    const env = environments.value.find(e => e.id === envId);
    if (!env || !env.quickLinks) return;

    const currentLinks = [...env.quickLinks];
    if (linkIndex >= currentLinks.length) return; 

    currentLinks.splice(linkIndex, 1);

    await updateEnvironment(envId, { quickLinks: currentLinks });
  }

  async function checkLinkStatus(url) {
    if (!url || typeof url !== 'string' || !url.trim()) return { status: 'error' };

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/status/check`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ url: url.trim() })
        });
        
        if (!res.ok) return { status: 'unknown' };
        
        return await res.json();
    } catch (e) {
        console.error(e);
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