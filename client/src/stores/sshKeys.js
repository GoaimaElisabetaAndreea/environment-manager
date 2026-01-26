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
        
        loading.value = true;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/environments/${envId}/ssh-keys`, { headers });

            if (!res.ok) throw new Error('Failed to fetch keys');

            keys.value = await res.json();
        } catch (error) {
            console.error(error);
            keys.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function addKey(keyData) {
        if (!keyData || typeof keyData !== 'object') throw new Error("Invalid key data");
        if (!keyData.title || !keyData.title.trim()) throw new Error("Title is required");
        if (!keyData.value || !keyData.value.trim()) throw new Error("Value is required");
        if (!keyData.envId) throw new Error("Environment ID is required");

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/environments/${keyData.envId}/ssh-keys`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: keyData.title.trim(),
                    value: keyData.value.trim(),
                    alias: keyData.alias ? keyData.alias.trim() : ''
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create key');
            }

            const newKey = await res.json();
            keys.value.push(newKey);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function updateKey(id, keyData) {
        if (!id) throw new Error("Invalid Key ID");
        
        const existingKey = keys.value.find(k => k.id === id);
        const envId = existingKey ? existingKey.envId : keyData.envId;

        if (!envId) throw new Error("Environment ID missing context for update");

        const updates = {};
        if (keyData.title !== undefined) updates.title = keyData.title.trim();
        if (keyData.alias !== undefined) updates.alias = keyData.alias.trim();
        if (keyData.value !== undefined) updates.value = keyData.value.trim();

        if (Object.keys(updates).length === 0) return;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/environments/${envId}/ssh-keys/${id}`, {
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
        if (!id) throw new Error("Invalid Key ID");
        
        const existingKey = keys.value.find(k => k.id === id);
        if (!existingKey || !existingKey.envId) return;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/environments/${existingKey.envId}/ssh-keys/${id}`, {
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
    
    async function testConnection(connectionString, privateKey = null) {
        if (!connectionString || typeof connectionString !== 'string' || !connectionString.trim()) {
            return { status: 'error', message: 'Empty connection string' };
        }

        let host = '';
        let username = '';
        let port = 22;

        const userHostMatch = connectionString.match(/([a-zA-Z0-9_.-]+)@([\w.-]+)/);
        if (userHostMatch) {
            username = userHostMatch[1];
            host = userHostMatch[2];
        } else {
            const parts = connectionString.split(' ');
            host = parts.find(p => p.includes('.') && !p.startsWith('-') && !p.includes('@')) || '';
        }

        const portMatch = connectionString.match(/-p\s+(\d+)/);
        if (portMatch) port = parseInt(portMatch[1]);

        if (!host) {
            return { status: 'error', message: "Could not parse host." };
        }

        try {
            const headers = await getAuthHeaders();
            
            const res = await fetch(`${API_URL}/ssh-keys/test`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ 
                    host, 
                    port, 
                    username, 
                    privateKey 
                })
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { status: 'error', message: e.message };
        }
    }

    return { keys, loading, fetchKeys, addKey, deleteKey, updateKey, testConnection };
});