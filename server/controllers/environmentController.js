const { db, admin } = require('../config/firebase');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default_secret').digest();
const IV_LENGTH = 16;

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const getEnvironments = async (req, res) => {
    try {
        const userId = req.user.uid;
        const snapshot = await db.collection('environments').where('userId', '==', userId).get();
        const environments = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.sshKeys) {
                data.sshKeys = data.sshKeys.map(key => ({
                    ...key,
                    value: key.value.includes(':') ? decrypt(key.value) : key.value
                }));
            }
            environments.push({ id: doc.id, ...data });
        })

        res.status(200).json(environments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const createEnvironments = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const newEnv = {
            name: name.trim(),
            userId: req.user.uid,
            quickLinks: [],
            commands: [],
            sshKeys: [],
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('environments').add(newEnv);
        res.status(201).json({ id: docRef.id, ...newEnv });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateEnvironment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, quickLinks } = req.body;

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ error: "Name must be a valid string" });
            }
            updates.name = name.trim();
        }

        if (quickLinks !== undefined) {
            if (!Array.isArray(quickLinks)) {
                return res.status(400).json({ error: "QuickLinks must be an array" });
            }
            updates.quickLinks = quickLinks;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update" });
        }

        const docRef = db.collection('environments').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Environment not found" });

        if (doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await docRef.update(updates);

        res.status(200).json({ id, ...doc.data(), ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const deleteEnvironment = async (req, res) => {
    try {
        const { id } = req.params;

        const docRef = db.collection('environments').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Environment not found" });

        if (doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await docRef.delete();

        res.status(200).json({ message: "Environment deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const addCommandToEnv = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, template, flags } = req.body;

        const newCommand = {
            id: crypto.randomUUID(),
            title,
            description: description || '',
            template,
            flags: flags || [],
            createdAt: new Date().toISOString()
        };

        const envRef = db.collection('environments').doc(id);
        const doc = await envRef.get();
        if (!doc.exists || doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await envRef.update({
            commands: admin.firestore.FieldValue.arrayUnion(newCommand)
        });

        res.status(200).json(newCommand);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const removeCommandFromEnv = async (req, res) => {
    try {
        const { id, cmdId } = req.params;

        const envRef = db.collection('environments').doc(id);
        const doc = await envRef.get();
        
        if (!doc.exists || doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        const envData = doc.data();
        const commandToDelete = envData.commands ? envData.commands.find(c => c.id === cmdId) : null;

        if (commandToDelete) {
            await envRef.update({
                commands: admin.firestore.FieldValue.arrayRemove(commandToDelete)
            });
        }

        res.status(200).json({ message: "Command deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addSshKeyToEnv = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, value, alias } = req.body;

        const newKey = {
            id: crypto.randomUUID(),
            title,
            value: encrypt(value),
            alias: alias || '',
            createdAt: new Date().toISOString()
        };

        const envRef = db.collection('environments').doc(id);
        const doc = await envRef.get();
        if (!doc.exists || doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await envRef.update({
            sshKeys: admin.firestore.FieldValue.arrayUnion(newKey)
        });

        newKey.value = value; 
        res.status(200).json(newKey);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const removeSshKeyFromEnv = async (req, res) => {
    try {
        const { id, keyId } = req.params;

        const envRef = db.collection('environments').doc(id);
        const doc = await envRef.get();
        
        if (!doc.exists || doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        const envData = doc.data();
        const keyToDelete = envData.sshKeys ? envData.sshKeys.find(k => k.id === keyId) : null;

        if (keyToDelete) {
            await envRef.update({
                sshKeys: admin.firestore.FieldValue.arrayRemove(keyToDelete)
            });
        }

        res.status(200).json({ message: "SSH Key deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    getEnvironments, 
    createEnvironments, 
    updateEnvironment, 
    deleteEnvironment,
    addCommandToEnv,
    removeCommandFromEnv,
    addSshKeyToEnv,
    removeSshKeyFromEnv
};