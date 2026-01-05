import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../firebase'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useEnvironmentStore } from './environments'

export const useCommandStore = defineStore('commands', () => {
  const commands = ref([])
  const loading = ref(false)
  const envStore = useEnvironmentStore()

  async function fetchCommands() {
    if(!envStore.currentEnvId){
        commands.value = [];
        return;
    }

    loading.value = true;

    try{
        const q = query(
            collection(db, 'commands'),
            where('envId', '==', envStore.currentEnvId)
        )

        const querySnapshot = await getDocs(q);
        commands.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (e) {
      console.error("Error fetching commands:", e)
    } finally {
      loading.value = false
    }
  }

async function addCommand(commandData) {
    if (!envStore.currentEnvId) return

    try {
      const docRef = await addDoc(collection(db, 'commands'), {
        ...commandData,
        envId: envStore.currentEnvId,
        createdAt: serverTimestamp()
      })
      
      commands.value.push({ 
          id: docRef.id, 
          ...commandData, 
          envId: envStore.currentEnvId 
      })
    } catch (e) {
      console.error("Error adding command:", e)
      throw e
    }
  }

  async function deleteCommand(id) {
    try{
        await deleteDoc(doc(db, 'commands', id));
        commands.value = commands.value.filter(command => command.id !== id);
    } catch (e) {
      console.error("Error deleting command:", e)
      throw e
    }
    
  }

  return { commands, loading, fetchCommands, addCommand, deleteCommand }
})