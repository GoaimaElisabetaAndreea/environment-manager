import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth } from '@/firebase';

export const useSshKeyStore = defineStore('sshKeys', () => {
    const keys = ref([]);
    const loading = ref(false);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const getAuthHeaders = async () => {
        if (!auth.currentUser) throw new Error("User not logged in");
        const token = await auth.currentUser.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    async function fetchKeys(envId) {
        if (!envId || typeof envId !== 'string') return;
        if (!auth.currentUser) return;

        loading.value = true;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/ssh-keys/${envId}`, { headers });

            if (!res.ok) throw new Error('Failed to fetch keys');

            keys.value = await res.json();
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    async function addKey(keyData) {
        if (!keyData || typeof keyData !== 'object') throw new Error("Invalid key data");
        if (!keyData.title || typeof keyData.title !== 'string' || !keyData.title.trim()) {
            throw new Error("Title is required");
        }
        if (!keyData.value || typeof keyData.value !== 'string' || !keyData.value.trim()) {
            throw new Error("Value is required");
        }
        if (!keyData.envId || typeof keyData.envId !== 'string') {
            throw new Error("Environment ID is required");
        }

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/ssh-keys`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: keyData.title.trim(),
                    value: keyData.value.trim(),
                    envId: keyData.envId,
                    alias: keyData.alias ? keyData.alias.trim() : ''
                })
            });

            if (!res.ok) throw new Error('Failed to create key');

            const newKey = await res.json();
            keys.value.push(newKey);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function updateKey(id, keyData) {
        if (!id || typeof id !== 'string') throw new Error("Invalid Key ID");
        if (!keyData || typeof keyData !== 'object') throw new Error("Invalid update data");

        const updates = {};
        if (keyData.title !== undefined) {
            if (typeof keyData.title !== 'string' || !keyData.title.trim()) throw new Error("Invalid title");
            updates.title = keyData.title.trim();
        }
        if (keyData.alias !== undefined) {
            if (typeof keyData.alias !== 'string') throw new Error("Invalid alias");
            updates.alias = keyData.alias.trim();
        }
        if (keyData.value !== undefined) {
            if (typeof keyData.value !== 'string' || !keyData.value.trim()) throw new Error("Invalid value");
            updates.value = keyData.value.trim();
        }

        if (Object.keys(updates).length === 0) throw new Error("No valid fields to update");

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/ssh-keys/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updates)
            });

            if (!res.ok) throw new Error('Failed to update key');

            const updatedKey = await res.json();

            const index = keys.value.findIndex(k => k.id === id);
            if (index !== -1) {
                keys.value[index] = { ...keys.value[index], ...updatedKey };
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function deleteKey(id) {
        if (!id || typeof id !== 'string') throw new Error("Invalid Key ID");

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/ssh-keys/${id}`, {
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
        if (!connectionString || typeof connectionString !== 'string' || !connectionString.trim()) {
            return { status: 'error', message: 'Empty connection string' };
        }

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
            console.error("Could not parse host");
            return { status: 'error', message: "Could not parse host from string. Make sure it contains 'user@host'" };
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

    return { keys, loading, fetchKeys, addKey, deleteKey, updateKey, testConnection };
});