import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useEnvironmentStore } from './environments'
import { auth } from '../firebase'
import { orderBy } from 'firebase/firestore'

export const useCommandStore = defineStore('commands', () => {
  const commands = ref([])
  const loading = ref(false)
  const envStore = useEnvironmentStore()

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const totalItems = ref(0)
  const currentPage = ref(1)
  const itemsPerPage = ref(9)
  const sortBy = ref('createdAt')
  const sortOrder = ref('desc')

  const getAuthHeaders = async () => {
    if (!auth.currentUser) throw new Error("User not logged in");
    const token = await auth.currentUser.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

async function fetchCommands(page = currentPage.value, limit = itemsPerPage.value) {
    if (!envStore.currentEnvId) return;
    loading.value = true;
    try {
      const headers = await getAuthHeaders();
      
      const params = new URLSearchParams({
          envId: envStore.currentEnvId,
          page: page.toString(),
          limit: limit.toString(),
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
      });

      const res = await fetch(`${API_URL}/commands?${params}`, { headers });
      if (res.ok) {
        const responseData = await res.json();
      
        commands.value = responseData.data;
        totalItems.value = responseData.total;
        currentPage.value = responseData.page;
      }
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function addCommand(commandData) {
    if (!envStore.currentEnvId) throw new Error("No environment selected");
    
    const { name, command, description, flags } = commandData;

    try {
      const headers = await getAuthHeaders();
      const payload = {
        name: name,
        command: command,
        description: description || '',
        flags: flags || [],
        envId: envStore.currentEnvId
      };

      const res = await fetch(`${API_URL}/commands`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add command");
      }

      const newCmd = await res.json();
      commands.value.push(newCmd);
    } catch (e) {
      console.error("Add Command Error:", e);
      throw e;
    }
  }

  async function updateCommand(id, updates) {
    if (!id) throw new Error("Invalid command ID");

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(`${API_URL}/commands/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update command");
      }

      const updatedCmd = await res.json();

      const index = commands.value.findIndex(c => c.id === id);
      if (index !== -1) {
        commands.value[index] = { ...commands.value[index], ...updatedCmd };
      }
    } catch (e) {
      console.error("Update Command Error:", e);
      throw e;
    }
  }

  async function deleteCommand(id) {
    if (!id) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/commands/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error("Failed delete");
      commands.value = commands.value.filter(c => c.id !== id);
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  return { 
      commands, 
      loading, 
      totalItems,
      currentPage,
      itemsPerPage,
      sortBy,       
      sortOrder,    
      fetchCommands, 
      addCommand, 
      updateCommand, 
      deleteCommand 
  }
})