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
    if (!envStore.currentEnvId) {
      commands.value = [];
      return;
    }

    if (typeof envStore.currentEnvId !== 'string') {
      console.error("Invalid Environment ID");
      return;
    }

    loading.value = true;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/commands?envId=${envStore.currentEnvId}`, { headers });

      if (!res.ok) throw new Error("Failed to fetch commands");

      commands.value = await res.json();
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function addCommand(commandData) {
    if (!envStore.currentEnvId) throw new Error("No environment selected");
    
    if (!commandData || typeof commandData !== 'object') {
        throw new Error("Invalid command data");
    }

    const { name, command } = commandData;

    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error("Command name is required");
    }
    if (!command || typeof command !== 'string' || !command.trim()) {
        throw new Error("Command content is required");
    }

    try {
      const headers = await getAuthHeaders();
      const payload = {
        name: name.trim(),
        command: command.trim(),
        envId: envStore.currentEnvId
      };

      const res = await fetch(`${API_URL}/commands`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add command");

      const newCmd = await res.json();
      commands.value.push(newCmd);
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async function updateCommand(id, updates) {
    if (!id || typeof id !== 'string') throw new Error("Invalid command ID");
    if (!updates || typeof updates !== 'object') throw new Error("Invalid update data");

    const sanitizedUpdates = {};

    if (updates.name !== undefined) {
        if (typeof updates.name !== 'string' || !updates.name.trim()) {
            throw new Error("Name must be a valid string");
        }
        sanitizedUpdates.name = updates.name.trim();
    }

    if (updates.command !== undefined) {
        if (typeof updates.command !== 'string' || !updates.command.trim()) {
            throw new Error("Command content must be a valid string");
        }
        sanitizedUpdates.command = updates.command.trim();
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
        throw new Error("No valid fields to update");
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/commands/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(sanitizedUpdates)
      });

      if (!res.ok) throw new Error("Failed to update command");

      const updatedCmd = await res.json();
      const index = commands.value.findIndex(c => c.id === id);
      if (index !== -1) {
        commands.value[index] = { ...commands.value[index], ...updatedCmd };
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async function deleteCommand(id) {
    if (!id || typeof id !== 'string') throw new Error("Invalid command ID");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/commands/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error("Failed to delete command");

      commands.value = commands.value.filter(command => command.id !== id);
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  return { commands, loading, fetchCommands, addCommand, updateCommand, deleteCommand }
})