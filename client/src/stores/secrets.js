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
        try {
            const encryptionKey = generateEncryptionKey();

            const passwordHash = password 
                ? CryptoJS.SHA256(password).toString() 
                : null;

            let encryptedFileContent = null;
            let encryptedFileName = null;

            if (file) {
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
            
            const encryptedText = text 
                ? CryptoJS.AES.encrypt(text, encryptionKey).toString() 
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
            console.error("Error creating secret: ", error);
            throw error;
        }
    }

    async function getSecretMetaData(id) {
        const res = await fetch(`${API_URL}/secrets/${id}/meta`);
        
        if (!res.ok) {
            if (res.status === 404 || res.status === 410) throw new Error("Secret not found or expired.");
            throw new Error("Error fetching metadata");
        }

        return await res.json();
    }

    async function revealSecret(id, encryptionKey, userPassword = null) {
        try {
            let passwordHash = null;
            if (userPassword) {
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
                if(!decryptedText) throw new Error("Decryption failed (Wrong URL key).");
            }

            if (data.file) {
                const fileBytes = CryptoJS.AES.decrypt(data.file.data, encryptionKey);
                const fileDataUrl = fileBytes.toString(CryptoJS.enc.Utf8);

                const nameBytes = CryptoJS.AES.decrypt(data.file.name, encryptionKey);
                const fileName = nameBytes.toString(CryptoJS.enc.Utf8);

                decryptedFile = {
                    dataUrl: fileDataUrl,
                    name: fileName
                };
            }

            return { text: decryptedText, file: decryptedFile };

        } catch (e) {
            console.error("Error revealing secret: ", e);
            throw e;
        }
    }

    return { createSecret, getSecretMetaData, revealSecret }
});