import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth } from '@/firebase';

export const useSshKeyStore = defineStore('sshKeys', () => {
    const keys = ref([]);
    const loading = ref(false);

    const getAuthHeaders = async () => {
        if (!auth.currentUser) throw new Error("User not logged in");
        const token = await auth.currentUser.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    async function fetchKeys(envId) {
        if (!envId) return;
        loading.value = true;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${import.meta.env.API_URL}/ssh-keys/${envId}`, { headers });
            
            if (!res.ok) throw new Error('Failed to fetch keys');
            
            keys.value = await res.json();
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    async function addKey(keyData) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${import.meta.env.API_URL}/ssh-keys`, {
                method: 'POST',
                headers,
                body: JSON.stringify(keyData)
            });

            if (!res.ok) throw new Error('Failed to create key');

            const newKey = await res.json();
            keys.value.push(newKey);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function deleteKey(id) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${import.meta.env.API_URL}/ssh-keys/${id}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) throw new Error('Failed to delete key');

            keys.value = keys.value.filter(k => k.id !== id);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function testConnection(connectionString) {
        let host = '';
        let port = 22;

        const hostMatch = connectionString.match(/@([\w.-]+)/);
        if (hostMatch) host = hostMatch[1];
        else {
             const parts = connectionString.split(' ');
             host = parts.find(p => p.includes('.') && !p.startsWith('-')) || '';
        }

        const portMatch = connectionString.match(/-p\s+(\d+)/);
        if (portMatch) port = parseInt(portMatch[1]);

        if (!host) {
            alert("Could not parse host from string. Make sure it contains 'user@host'");
            return { status: 'error' };
        }

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/ssh-keys/test`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ host, port })
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { status: 'error' };
        }
    }

    return { keys, loading, fetchKeys, addKey, deleteKey, testConnection };
});