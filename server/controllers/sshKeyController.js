const { db } = require('../config/firebase');
const { Client } = require('ssh2');
const crypto = require('crypto');
const net = require('net');

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

const createKey = async (req, res) => {
    try {
        const { title, value, envId, alias } = req.body;
        const userId = req.user.uid;

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: "Title is required" });
        }
        if (!value || typeof value !== 'string' || !value.trim()) {
            return res.status(400).json({ error: "Value (Key) is required" });
        }
        if (!envId || typeof envId !== 'string') {
            return res.status(400).json({ error: "Environment ID is required" });
        }

        const envDoc = await db.collection('environments').doc(envId).get();
        if (!envDoc.exists) {
            return res.status(404).json({ error: "Environment not found" });
        }
        if (envDoc.data().userId !== userId) {
            return res.status(403).json({ error: "Unauthorized access to this environment" });
        }

        const encryptedValue = encrypt(value.trim());
        const newKey = {
            title: title.trim(),
            alias: alias && typeof alias === 'string' ? alias.trim() : '',
            value: encryptedValue,
            envId,
            userId,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('ssh_keys').add(newKey);
        res.status(201).json({ id: docRef.id, ...newKey, value: value.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateKey = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, value, alias } = req.body;
        const updates = {};

        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ error: "Title must be a valid string" });
            }
            updates.title = title.trim();
        }

        if (alias !== undefined) {
            if (typeof alias !== 'string') {
                return res.status(400).json({ error: "Alias must be a string" });
            }
            updates.alias = alias.trim();
        }

        if (value !== undefined) {
            if (typeof value !== 'string' || !value.trim()) {
                return res.status(400).json({ error: "Value must be a valid string" });
            }
            updates.value = encrypt(value.trim());
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update" });
        }

        const docRef = db.collection('ssh_keys').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Key not found" });
        if (doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Not authorized" });

        await docRef.update(updates);
        res.status(200).json({ id, ...doc.data(), ...updates, value: value || "[Encrypted]" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getKeysByEnv = async (req, res) => {
    try {
        const { envId } = req.params;

        if (!envId || typeof envId !== 'string') {
            return res.status(400).json({ error: "Environment ID is required" });
        }

        const snapshot = await db.collection('ssh_keys')
            .where('envId', '==', envId)
            .where('userId', '==', req.user.uid)
            .get();

        const keys = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            try {
                data.value = data.value.includes(':') ? decrypt(data.value) : data.value;
            } catch (e) {
                console.error("Decryption failed for doc", doc.id);
                data.value = "[Error Decrypting]";
            }
            keys.push({ id: doc.id, ...data });
        });

        res.status(200).json(keys);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteKey = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) return res.status(400).json({ error: "ID is required" });

        const docRef = db.collection('ssh_keys').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Key not found" });
        }

        if (doc.data().userId !== req.user.uid) {
            return res.status(403).json({ error: "Not authorized" });
        }

        await docRef.delete();
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const testConnection = async (req, res) => {
    const { host, port, username, privateKey } = req.body;

    if (!host || typeof host !== 'string' || !host.trim()) {
        return res.status(400).json({ error: 'Valid host is required' });
    }

    let targetPort = 22;
    if (port !== undefined) {
        const parsedPort = parseInt(port, 10);
        if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
            targetPort = parsedPort;
        }
    }

    const conn = new Client();

    const timeout = setTimeout(() => {
        try { conn.end(); } catch(e){}
        if (!res.headersSent) {
            res.json({ host, port: targetPort, status: 'timeout', message: 'Connection timed out' });
        }
    }, 5000);

    conn.on('ready', () => {
        clearTimeout(timeout);
        conn.end();

        if (!res.headersSent) {
            res.json({ host, port: targetPort, status: 'open', message: 'SSH Connection & Auth Successful!' });
        }
    });

    conn.on('error', (err) => {
        clearTimeout(timeout);
        
        if (err.level === 'client-authentication' || err.message.includes('All configured authentication methods failed')) {
            if (!res.headersSent) {
                res.json({ 
                    host, 
                    port: targetPort, 
                    status: 'open', 
                    message: 'SSH Service Online (Auth required)' 
                });
            }
        } else {
        
            if (!res.headersSent) {
                res.json({ host, port: targetPort, status: 'error', message: err.message });
            }
        }
    });

    try {
        conn.connect({
            host: host,
            port: targetPort,
            username: username || 'root', 
            privateKey: privateKey, 
            readyTimeout: 5000
        });
    } catch (e) {
        clearTimeout(timeout);
        if (!res.headersSent) res.status(500).json({ error: "Failed to init SSH client" });
    }
};

module.exports = { createKey, getKeysByEnv, deleteKey, testConnection, updateKey };

module.exports = { createKey, getKeysByEnv, deleteKey, testConnection, updateKey };