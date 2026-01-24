const { db, admin } = require('../config/firebase');

const deleteSecretData = async (id, data) => {
    try {
        await db.collection('secrets').doc(id).delete();
        if (data.storagePath) {
            await admin.storage().bucket().file(data.storagePath).delete().catch(e => console.log("Storage delete error:", e.message));
        }
    } catch (e) {
        console.error("Error deleting secret data:", e);
    }
};

const createSecret = async (req, res) => {
    try {
        const { encryptedContent, encryptedFile, encryptedFileName, passwordHash, ttlInMinutes } = req.body;

        const expiresAt = new Date(Date.now() + ttlInMinutes * 60000).toISOString();
        let storagePath = null;

        if (encryptedFile) {
            const fileName = `secrets/${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const bucket = admin.storage().bucket();
            const file = bucket.file(fileName);
            
            await file.save(encryptedFile);
            storagePath = fileName;
        }

        const docRef = await db.collection('secrets').add({
            content: encryptedContent || null,
            storagePath: storagePath, 
            fileName: encryptedFileName || null,
            passwordHash: passwordHash || null,
            expiresAt: expiresAt,
            createdAt: new Date().toISOString(),
            viewed: false
        });

        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const getSecretMetaData = async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('secrets').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Secret not found or already deleted." });
        }

        const data = doc.data();

        if (new Date(data.expiresAt) < new Date()) {
            await deleteSecretData(id, data);
            return res.status(410).json({ error: "Secret expired." });
        }

        res.status(200).json({
            hasPassword: !!data.passwordHash,
            id: id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const revealSecret = async (req, res) => {
    try {
        const { id } = req.params;
        const { passwordHash } = req.body; 

        const docRef = db.collection('secrets').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Secret not found." });
        }

        const data = doc.data();

        if (data.passwordHash) {
            if (!passwordHash || passwordHash !== data.passwordHash) {
                return res.status(403).json({ error: "Incorrect password." });
            }
        }

        let fileContent = null;
        if (data.storagePath) {
            const bucket = admin.storage().bucket();
            const [content] = await bucket.file(data.storagePath).download();
            fileContent = content.toString('utf-8'); 
        }

        await deleteSecretData(id, data);

        res.status(200).json({
            text: data.content,
            file: fileContent ? {
                data: fileContent,
                name: data.fileName
            } : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createSecret, getSecretMetaData, revealSecret };