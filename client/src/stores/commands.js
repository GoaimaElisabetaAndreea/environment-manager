import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useEnvironmentStore } from './environments'
import { auth } from '../firebase'

export const useCommandStore = defineStore('commands', () => {
  const commands = ref([])
  const loading = ref(false)
  const envStore = useEnvironmentStore()
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const getAuthHeaders = async () => {
      if (!auth.currentUser) throw new Error("User not logged in");
      const token = await auth.currentUser.getIdToken();
      return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      };
  };

  async function fetchCommands() {
    if(!envStore.currentEnvId){
        commands.value = [];
        return;
    }

    loading.value = true;

    try{
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/commands?envId=${envStore.currentEnvId}`, { headers });
        
        if(!res.ok) throw new Error("Failed to fetch commands");

        commands.value = await res.json();
    } catch (e) {
      console.error("Error fetching commands:", e)
    } finally {
      loading.value = false
    }
  }

  async function addCommand(commandData) {
    if (!envStore.currentEnvId) return

    try {
      const headers = await getAuthHeaders();
      const payload = {
          ...commandData,
          envId: envStore.currentEnvId
      };

      const res = await fetch(`${API_URL}/commands`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
      });

      if(!res.ok) throw new Error("Failed to add command");

      const newCmd = await res.json();
      commands.value.push(newCmd);
    } catch (e) {
      console.error("Error adding command:", e)
      throw e
    }
  }

  async function deleteCommand(id) {
    try{
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/commands/${id}`, {
            method: 'DELETE',
            headers
        });

        if(!res.ok) throw new Error("Failed to delete command");

        commands.value = commands.value.filter(command => command.id !== id);
    } catch (e) {
      console.error("Error deleting command:", e)
      throw e
    }
  }

  return { commands, loading, fetchCommands, addCommand, deleteCommand }
})