import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export const useEnvironmentStore = defineStore('environments', () => {
  const environments = ref([]) 
  const currentEnvId = ref(localStorage.getItem('currentEnvId') || null);
  const loading = ref(false);

  const currentEnvironment = computed(() => 
    environments.value.find(env => env.id === currentEnvId.value)
  )

  async function fetchEnvironments() {
    if (!auth.currentUser) return; 

    try{
      const q = query(
        collection(db, 'environments'),
        where('userId', '==', auth.currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      environments.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

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
    if (!auth.currentUser) return

    try{
      const docRef = await addDoc(collection(db, 'environments'), {
        name: name,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      const newEnv = { id: docRef.id, name, userId: auth.currentUser.uid };
      environments.value.push(newEnv);

      selectEnvironment(docRef.id)
      
      return docRef.id
    } catch(e){
      console.error("Error trying to create new env: ", e);
      throw e;
    }
  }

  async function deleteEnvironment(id) {
    if(!confirm("Are you sure you want to delete this?")) return;

    try{
      await deleteDoc(doc(db, 'environments', id));

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
        const envRef = doc(db, 'environments', id);
        await updateDoc(envRef, data);

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

  return { 
    environments, 
    currentEnvId, 
    currentEnvironment, 
    loading, 
    fetchEnvironments, 
    addEnvironment, 
    deleteEnvironment,
    updateEnvironment,
    selectEnvironment 
  };
});