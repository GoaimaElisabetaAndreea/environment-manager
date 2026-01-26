import { ref } from 'vue';
import { defineStore } from 'pinia';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../firebase';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const loading = ref(true);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    async function login(email, password, rememberMe = true) {
        loading.value = true;
        
        try {
            if (!email || typeof email !== 'string' || !email.trim()) {
                throw new Error("Valid email is required");
            }
            if (!validateEmail(email)) {
                throw new Error("Invalid email format");
            }
            if (!password || typeof password !== 'string' || !password.trim()) {
                throw new Error("Password is required");
            }

            const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceMode);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e) {
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function register(email, password) {
        loading.value = true;
        
        try {
            if (!email || typeof email !== 'string' || !email.trim()) {
                throw new Error("Valid email is required");
            }
            if (!validateEmail(email)) {
                throw new Error("Invalid email format");
            }
            if (!password || typeof password !== 'string' || password.length < 6) {
                throw new Error("Password must be at least 6 characters long");
            }

            await createUserWithEmailAndPassword(auth, email, password);
        } catch (e) {
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function logout() {
        await signOut(auth);
        user.value = null;
    }

    async function resetPassword(email) {
        loading.value = true;
        
        try {
            if (!email || typeof email !== 'string' || !email.trim()) {
                throw new Error("Valid email is required");
            }
            if (!validateEmail(email)) {
                throw new Error("Invalid email format");
            }

            await sendPasswordResetEmail(auth, email);
        } catch (e) {
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return { user, loading, login, register, logout, resetPassword };
});