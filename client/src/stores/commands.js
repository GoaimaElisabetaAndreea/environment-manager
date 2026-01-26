import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useEnvironmentStore } from './environments'
import { auth } from '../firebase'

export const useCommandStore = defineStore('commands', () => {
  const commands = ref([])
  const loading = ref(false)
  const envStore = useEnvironmentStore()

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const totalItems = ref(0)
  const currentPage = ref(1)
  const itemsPerPage = ref(9)
  const sortBy = ref('createdAt')
  const sortOrder = ref('desc')

  const getAuthHeaders = async () => {
    const user = auth.currentUser
    if (!user) {
      throw new Error("Security Violation: User is not authenticated.")
    }
    const token = await user.getIdToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const validateEnvironment = () => {
    if (!envStore.currentEnvId) {
      throw new Error("Validation Error: No environment context selected.")
    }
    return envStore.currentEnvId
  }

  async function fetchCommands(page = currentPage.value, limit = itemsPerPage.value) {
    loading.value = true
    try {
      const envId = validateEnvironment()
      const headers = await getAuthHeaders()
      
      const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
      })

      const res = await fetch(`${API_URL}/environments/${envId}/commands?${params}`, { headers })
      
      if (res.ok) {
        const responseData = await res.json()
        commands.value = responseData.data
        totalItems.value = responseData.total
        currentPage.value = responseData.page
      } else if (res.status === 401 || res.status === 403) {
          throw new Error("Unauthorized access to commands.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function addCommand(commandData) {
    const envId = validateEnvironment()
    
    if (!commandData || typeof commandData !== 'object') {
        throw new Error("Invalid command data provided.")
    }
    
    const name = commandData.name?.trim()
    const command = commandData.command?.trim()
    
    if (!name || name.length < 2) {
        throw new Error("Validation Error: Command name is required and must be at least 2 characters.")
    }
    if (!command) {
        throw new Error("Validation Error: The command script cannot be empty.")
    }

    try {
      const headers = await getAuthHeaders()
      const payload = {
        name,
        command,
        description: commandData.description?.trim() || '',
        flags: Array.isArray(commandData.flags) ? commandData.flags : []
      }

      const res = await fetch(`${API_URL}/environments/${envId}/commands`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add command")
      }

      const newCmd = await res.json()
      commands.value.unshift(newCmd) 
      totalItems.value++
    } catch (e) {
      console.error("Add Command Error:", e)
      throw e
    }
  }

  async function updateCommand(id, updates) {
    const envId = validateEnvironment()

    if (!id) throw new Error("Validation Error: Command ID is missing.")
    if (!updates || Object.keys(updates).length === 0) {
        throw new Error("Validation Error: No update data provided.")
    }

    try {
      const headers = await getAuthHeaders()

      const res = await fetch(`${API_URL}/environments/${envId}/commands/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update command")
      }

      const updatedCmd = await res.json()

      const index = commands.value.findIndex(c => c.id === id)
      if (index !== -1) {
        commands.value[index] = { ...commands.value[index], ...updatedCmd }
      }
    } catch (e) {
      console.error("Update Command Error:", e)
      throw e
    }
  }

  async function deleteCommand(id) {
    const envId = validateEnvironment()
    if (!id) throw new Error("Validation Error: Command ID is missing.")

    try {
      const headers = await getAuthHeaders()
      
      const res = await fetch(`${API_URL}/environments/${envId}/commands/${id}`, { 
          method: 'DELETE', 
          headers 
      })
      
      if (!res.ok) {
        if (res.status === 403) throw new Error("You do not have permission to delete this command.")
        throw new Error("Failed delete")
      }
      
      commands.value = commands.value.filter(c => c.id !== id)
      totalItems.value--
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