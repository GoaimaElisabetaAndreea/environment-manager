import { ref } from 'vue';
import { defineStore } from 'pinia';
import { auth } from '../firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);

    async function register(email, password) {
        try{
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user.value = userCredential.user;
        } catch(error){
            console.error("Registration failed: ", error);
            throw error;
        }
    }
    
    async function login(email, password){
        try{
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user.value = userCredential.user;
        } catch(error){
            console.error("Login failed: ", error );
            throw error;
        }
    }

    async function logout() {
        await signOut(auth);
        user.value = null;
    }

    return { user, register, login, logout };
});