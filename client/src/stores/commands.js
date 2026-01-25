import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useEnvironmentStore } from './environments'
import { auth } from '../firebase'

export const useCommandStore = defineStore('commands', () => {
  const envStore = useEnvironmentStore()
  const loading = ref(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const commands = computed(() => {
      return envStore.currentEnvironment?.commands || [];
  });

  const getAuthHeaders = async () => {
    if (!auth.currentUser) throw new Error("User not logged in");
    const token = await auth.currentUser.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  async function fetchCommands() {}

  async function addCommand(commandData) {
    if (!envStore.currentEnvId) throw new Error("No environment selected");
    
    try {
      const headers = await getAuthHeaders();
      const payload = {
        title: commandData.title,
        description: commandData.description,
        template: commandData.template, 
        flags: commandData.flags
      };

      const res = await fetch(`${API_URL}/environments/${envStore.currentEnvId}/commands`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add command");

      await envStore.fetchEnvironments(); 
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async function updateCommand(id, updates) {
      alert("Update-ul necesită implementare backend pentru modificarea obiectelor din array (subiect pentru bonus)");
  }

  async function deleteCommand(id) {
    if (!id) throw new Error("Invalid command ID");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/environments/${envStore.currentEnvId}/commands/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error("Failed to delete command");

      await envStore.fetchEnvironments();
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  return { commands, loading, fetchCommands, addCommand, updateCommand, deleteCommand }
})