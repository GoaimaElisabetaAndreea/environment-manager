import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth } from '@/firebase';
import { useEnvironmentStore } from './environments';

export const useSshKeyStore = defineStore('sshKeys', () => {
    const envStore = useEnvironmentStore();
    const loading = ref(false);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const keys = computed(() => {
        return envStore.currentEnvironment?.sshKeys || [];
    });

    const getAuthHeaders = async () => {
        if (!auth.currentUser) throw new Error("User not logged in");
        const token = await auth.currentUser.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    async function fetchKeys() {}

    async function addKey(keyData) {
        if (!envStore.currentEnvId) throw new Error("No environment selected");

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/environments/${envStore.currentEnvId}/ssh-keys`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: keyData.title,
                    value: keyData.value,
                    alias: keyData.alias
                })
            });

            if (!res.ok) throw new Error('Failed to create key');

            await envStore.fetchEnvironments();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function updateKey(id, keyData) {
         alert("Update-ul necesită implementare backend pentru modificarea obiectelor din array.");
    }

    async function deleteKey(id) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/environments/${envStore.currentEnvId}/ssh-keys/${id}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) throw new Error('Failed to delete key');

            await envStore.fetchEnvironments();
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
            return { status: 'error', message: "Could not parse host" };
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