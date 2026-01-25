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

        if (!ttlInMinutes || typeof ttlInMinutes !== 'number' || ttlInMinutes <= 0) {
            return res.status(400).json({ error: "Valid ttlInMinutes (positive number) is required" });
        }

        const hasContent = encryptedContent && typeof encryptedContent === 'string' && encryptedContent.trim().length > 0;
        const hasFile = encryptedFile !== undefined && encryptedFile !== null;

        if (!hasContent && !hasFile) {
            return res.status(400).json({ error: "Either encryptedContent or encryptedFile must be provided" });
        }

        if (hasFile) {
            if (!encryptedFileName || typeof encryptedFileName !== 'string' || !encryptedFileName.trim()) {
                return res.status(400).json({ error: "encryptedFileName is required when uploading a file" });
            }
        }

        if (passwordHash !== undefined && passwordHash !== null && (typeof passwordHash !== 'string' || !passwordHash.trim())) {
            return res.status(400).json({ error: "passwordHash must be a valid string if provided" });
        }

        const expiresAt = new Date(Date.now() + ttlInMinutes * 60000).toISOString();
        let storagePath = null;

        if (hasFile) {
            const fileName = `secrets/${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const bucket = admin.storage().bucket();
            const file = bucket.file(fileName);

            await file.save(encryptedFile);
            storagePath = fileName;
        }

        const newSecret = {
            content: hasContent ? encryptedContent : null,
            storagePath: storagePath,
            fileName: hasFile ? encryptedFileName : null,
            passwordHash: passwordHash || null,
            expiresAt: expiresAt,
            createdAt: new Date().toISOString(),
            viewed: false
        };

        const docRef = await db.collection('secrets').add(newSecret);

        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const getSecretMetaData = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: "Invalid ID" });
        }

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

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: "Invalid ID" });
        }

        if (passwordHash !== undefined && passwordHash !== null && typeof passwordHash !== 'string') {
            return res.status(400).json({ error: "Invalid password format" });
        }

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