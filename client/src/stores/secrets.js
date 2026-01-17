import { defineStore } from 'pinia';
import { db, storage } from '../firebase.js'; 
import { collection, addDoc, doc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import CryptoJS from 'crypto-js';

export const useSecretStore = defineStore('secrets', () => {

    function generateEncryptionKey() {
        return CryptoJS.lib.WordArray.random(16).toString();
    }

    async function createSecret({ text, file, password, ttlInMinutes }) {
        try {
            const encryptionKey = generateEncryptionKey();

            const expiresAt = new Date(Date.now() + ttlInMinutes * 60000).toISOString();

            const passwordHash = password 
                ? CryptoJS.SHA256(password).toString() 
                : null;

            let encryptedFileUrl = null;
            let encryptedFileName = null;
            let storagePath = null;

            if (file) {
                const fileToUpload = Array.isArray(file) ? file[0] : file;

                const fileDataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(fileToUpload);
                });

                const encryptedFileContent = CryptoJS.AES.encrypt(fileDataUrl, encryptionKey).toString();
                
                const fileName = `secrets/${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const fileRef = storageRef(storage, fileName);
                
                await uploadString(fileRef, encryptedFileContent);
                encryptedFileUrl = await getDownloadURL(fileRef);
                storagePath = fileName;
                
                encryptedFileName = CryptoJS.AES.encrypt(fileToUpload.name, encryptionKey).toString();
            }
            
            const encryptedText = text 
                ? CryptoJS.AES.encrypt(text, encryptionKey).toString() 
                : null;

            const docRef = await addDoc(collection(db, "secrets"), {
                content: encryptedText,
                fileUrl: encryptedFileUrl,
                fileName: encryptedFileName,
                storagePath: storagePath,
                passwordHash: passwordHash,
                expiresAt: expiresAt,
                createdAt: serverTimestamp(),
                viewed: false
            });

            return { id: docRef.id, key: encryptionKey };

        } catch(error){
            console.error("Error creating secret: ", error);
            throw error;
        }
    }

    async function getSecretMetaData(id) {
        const docRef = doc(db, "secrets", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("Secret not found or already deleted.");

        const data = docSnap.data();

        if (new Date(data.expiresAt) < new Date()) {
            await deleteSecretData(id, data);
            throw new Error("Secret expired.");
        }

        return {
            hasPassword: !!data.passwordHash,
            id: id
        };
    }

    async function revealSecret(id, encryptionKey, userPassword = null) {
        try {
            const docRef = doc(db, "secrets", id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) throw new Error("Secret not found.");

            const data = docSnap.data();

            if (data.passwordHash) {
                if (!userPassword) throw new Error("Password required.");
                const inputHash = CryptoJS.SHA256(userPassword).toString();
                if (inputHash !== data.passwordHash) throw new Error("Incorrect password.");
            }

            let decryptedText = null;
            let decryptedFile = null;

            if (data.content) {
                const bytes = CryptoJS.AES.decrypt(data.content, encryptionKey);
                decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                if(!decryptedText) throw new Error("Decryption failed (Wrong URL key).");
            }

            if (data.fileUrl) {
                const response = await fetch(data.fileUrl);
                const encryptedFileContent = await response.text();
            
                const fileBytes = CryptoJS.AES.decrypt(encryptedFileContent, encryptionKey);
                const fileDataUrl = fileBytes.toString(CryptoJS.enc.Utf8);

                const nameBytes = CryptoJS.AES.decrypt(data.fileName, encryptionKey);
                const fileName = nameBytes.toString(CryptoJS.enc.Utf8);

                decryptedFile = {
                    dataUrl: fileDataUrl,
                    name: fileName
                };
            }
            await deleteSecretData(id, data);

            return { text: decryptedText, file: decryptedFile };

        } catch (e) {
            console.error("Error revealing secret: ", e);
            throw e;
        }
    }

    async function deleteSecretData(id, data) {
        await deleteDoc(doc(db, "secrets", id));
        if (data.storagePath) {
            const fileRef = storageRef(storage, data.storagePath);
            await deleteObject(fileRef).catch(e => console.log("File cleanup error", e));
        }
    }

    return { createSecret, getSecretMetaData, revealSecret }
});