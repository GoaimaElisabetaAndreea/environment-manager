import { defineStore } from 'pinia';
import { auth } from '../firebase.js'; 
import CryptoJS from 'crypto-js';

export const useSecretStore = defineStore('secrets', () => {

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    function generateEncryptionKey() {
        return CryptoJS.lib.WordArray.random(16).toString();
    }

    const getAuthHeaders = async () => {
        if (!auth.currentUser) throw new Error("User not logged in");
        const token = await auth.currentUser.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    async function createSecret({ text, file, password, ttlInMinutes }) {
        if (!ttlInMinutes || typeof ttlInMinutes !== 'number' || ttlInMinutes <= 0) {
            throw new Error("Invalid Time-to-Live (TTL)");
        }

        const hasText = text && typeof text === 'string' && text.trim().length > 0;
        const hasFile = file !== null && file !== undefined;

        if (!hasText && !hasFile) {
            throw new Error("Either text content or a file is required");
        }

        try {
            const encryptionKey = generateEncryptionKey();

            const passwordHash = password && typeof password === 'string' && password.trim()
                ? CryptoJS.SHA256(password).toString() 
                : null;

            let encryptedFileContent = null;
            let encryptedFileName = null;

            if (hasFile) {
                const fileToUpload = Array.isArray(file) ? file[0] : file;

                const fileDataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(fileToUpload);
                });

                encryptedFileContent = CryptoJS.AES.encrypt(fileDataUrl, encryptionKey).toString();
                encryptedFileName = CryptoJS.AES.encrypt(fileToUpload.name, encryptionKey).toString();
            }
            
            const encryptedText = hasText 
                ? CryptoJS.AES.encrypt(text.trim(), encryptionKey).toString() 
                : null;

            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/secrets`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    encryptedContent: encryptedText,
                    encryptedFile: encryptedFileContent,
                    encryptedFileName: encryptedFileName,
                    passwordHash: passwordHash,
                    ttlInMinutes: ttlInMinutes
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create secret");
            }

            const data = await res.json();
            return { id: data.id, key: encryptionKey };

        } catch(error){
            console.error(error);
            throw error;
        }
    }

    async function getSecretMetaData(id) {
        if (!id || typeof id !== 'string') throw new Error("Invalid Secret ID");

        const res = await fetch(`${API_URL}/secrets/${id}/meta`);
        
        if (!res.ok) {
            if (res.status === 404 || res.status === 410) throw new Error("Secret not found or expired.");
            throw new Error("Error fetching metadata");
        }

        return await res.json();
    }

    async function revealSecret(id, encryptionKey, userPassword = null) {
        if (!id || typeof id !== 'string') throw new Error("Invalid Secret ID");
        if (!encryptionKey || typeof encryptionKey !== 'string') throw new Error("Missing encryption key");

        try {
            let passwordHash = null;
            if (userPassword) {
                if (typeof userPassword !== 'string') throw new Error("Invalid password format");
                passwordHash = CryptoJS.SHA256(userPassword).toString();
            }

            const res = await fetch(`${API_URL}/secrets/${id}/reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passwordHash })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to reveal secret");
            }

            const data = await res.json();

            let decryptedText = null;
            let decryptedFile = null;

            if (data.text) {
                const bytes = CryptoJS.AES.decrypt(data.text, encryptionKey);
                decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                if(!decryptedText) throw new Error("Decryption failed. The key provided may be incorrect.");
            }

            if (data.file) {
                const fileBytes = CryptoJS.AES.decrypt(data.file.data, encryptionKey);
                const fileDataUrl = fileBytes.toString(CryptoJS.enc.Utf8);

                const nameBytes = CryptoJS.AES.decrypt(data.file.name, encryptionKey);
                const fileName = nameBytes.toString(CryptoJS.enc.Utf8);

                if (!fileDataUrl || !fileName) throw new Error("File decryption failed.");

                decryptedFile = {
                    dataUrl: fileDataUrl,
                    name: fileName
                };
            }

            return { text: decryptedText, file: decryptedFile };

        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    return { createSecret, getSecretMetaData, revealSecret }
});