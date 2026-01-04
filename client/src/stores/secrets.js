import { defineStore } from 'pinia';
import { db } from '../firebase.js';
import { collection, addDoc, doc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

export const useSecretStore = defineStore('secrets', () => {
    async function createSecret(content) {
        try{
            const docRef = await addDoc(collection(db, "secrets"), {
                content: content,
                createdAt: serverTimestamp(),
                viewed: false
            });

            return docRef.id;
        } catch(error){
            console.error("Error adding document: ", error);
            throw error;
        }
    }

    async function getSecret(id) {
        try{
            const docRef = doc(db, "secrets", id);
            const docSnap = await getDoc(docRef);

            if(docSnap.exists()){
                const data = docSnap.data();
                await deleteDoc(docRef);

                return data.content;
            } else {
                throw new Error("Secret does not exists or was already viewed");
            }
        }catch (e) {
            console.error("Error fetching document: ", e);
            throw e;
        }
    } 

    return { createSecret, getSecret }
});