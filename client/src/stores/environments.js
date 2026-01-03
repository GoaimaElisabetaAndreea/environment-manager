import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useEnvironmentStore = defineStore('environments', () => {
  const environments = ref([]) 

  function addEnv(env) {
    environments.value.push(env)
  }

  return { environments, addEnv }
})