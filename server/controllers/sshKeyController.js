const { db } = require('../config/firebase');
const { Client } = require('ssh2');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default_secret').digest();
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return '';
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        throw new Error("Failed to encrypt data");
    }
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return "[Decryption Failed]";
    }
}

const validateEnvironmentAccess = async (envId, userId) => {
    if (!envId || typeof envId !== 'string') {
        const error = new Error("Invalid Environment ID");
        error.status = 400;
        throw error;
    }

    const envRef = db.collection('environments').doc(envId);
    const envDoc = await envRef.get();
    
    if (!envDoc.exists) {
        const error = new Error("Environment not found");
        error.status = 404;
        throw error;
    }

    if (envDoc.data().userId !== userId) {
        const error = new Error("Unauthorized access to this environment");
        error.status = 403;
        throw error;
    }
    
    return envRef;
};

const createKey = async (req, res) => {
    try {
        const { envId } = req.params;
        const { title, value, alias } = req.body;
        const userId = req.user.uid;

        if (!title || typeof title !== 'string' || title.trim().length < 2) {
            return res.status(400).json({ error: "Title is required and must be at least 2 characters." });
        }
        if (!value || typeof value !== 'string' || value.trim().length < 10) {
            return res.status(400).json({ error: "Valid SSH Key (Private Key) is required." });
        }

        const envRef = await validateEnvironmentAccess(envId, userId);

        const encryptedValue = encrypt(value.trim());
        
        const newKeyPayload = {
            title: title.trim(),
            alias: alias && typeof alias === 'string' ? alias.trim() : '',
            value: encryptedValue,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await envRef.collection('ssh_keys').add(newKeyPayload);

        res.status(201).json({ 
            id: docRef.id, 
            envId, 
            ...newKeyPayload, 
            value: value.trim() 
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

const getKeysByEnv = async (req, res) => {
    try {
        const { envId } = req.params;
        const userId = req.user.uid;

        const envRef = await validateEnvironmentAccess(envId, userId);

        const snapshot = await envRef.collection('ssh_keys')
            .orderBy('createdAt', 'desc')
            .get();

        const keys = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let safeValue = "";
            
            if (data.value && typeof data.value === 'string') {
                 safeValue = decrypt(data.value);
            }

            keys.push({ 
                id: doc.id, 
                envId, 
                ...data,
                value: safeValue 
            });
        });

        res.status(200).json(keys);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

const updateKey = async (req, res) => {
    try {
        const { envId, keyId } = req.params;
        const { title, value, alias } = req.body;
        const userId = req.user.uid;

        if (!keyId) return res.status(400).json({ error: "Key ID is missing" });

        const envRef = await validateEnvironmentAccess(envId, userId);
        
        const keyRef = envRef.collection('ssh_keys').doc(keyId);
        const keyDoc = await keyRef.get();

        if (!keyDoc.exists) return res.status(404).json({ error: "SSH Key not found" });

        const updates = { updatedAt: new Date().toISOString() };
        let decryptedValue = null;

        if (title !== undefined) {
            if (typeof title !== 'string' || title.trim().length < 2) {
                return res.status(400).json({ error: "Title must be at least 2 characters" });
            }
            updates.title = title.trim();
        }

        if (alias !== undefined) {
             updates.alias = typeof alias === 'string' ? alias.trim() : '';
        }

        if (value !== undefined) {
            if (typeof value !== 'string' || value.trim().length < 10) {
                return res.status(400).json({ error: "Invalid SSH Key provided" });
            }
            updates.value = encrypt(value.trim());
            decryptedValue = value.trim();
        } else {
            const existingEncrypted = keyDoc.data().value;
            decryptedValue = decrypt(existingEncrypted);
        }

        await keyRef.update(updates);
        
        const responseData = { ...keyDoc.data(), ...updates };
        responseData.value = decryptedValue;

        res.status(200).json({ 
            id: keyId, 
            envId, 
            ...responseData 
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

const deleteKey = async (req, res) => {
    try {
        const { envId, keyId } = req.params;
        const userId = req.user.uid;

        if (!keyId) return res.status(400).json({ error: "Key ID is required" });

        const envRef = await validateEnvironmentAccess(envId, userId);
        const keyRef = envRef.collection('ssh_keys').doc(keyId);
        
        const doc = await keyRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Key not found" });
        
        await keyRef.delete();

        res.status(200).json({ message: "SSH Key deleted successfully" });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

const testConnection = async (req, res) => {
    const { host, port, username, privateKey } = req.body;

    if (!host || typeof host !== 'string' || !host.trim()) {
        return res.status(400).json({ error: 'Valid Host/IP is required' });
    }
    
    if (!privateKey || typeof privateKey !== 'string' || privateKey.length < 20) {
        return res.status(400).json({ error: 'Valid Private Key is required for connection test' });
    }

    let targetPort = 22;
    if (port !== undefined && port !== null && port !== '') {
        const parsedPort = parseInt(port, 10);
        if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
            return res.status(400).json({ error: 'Port must be a number between 1 and 65535' });
        }
        targetPort = parsedPort;
    }

    const conn = new Client();
    let responseSent = false;

    const timeout = setTimeout(() => {
        if (!responseSent) {
            responseSent = true;
            try { conn.end(); } catch(e){}
            res.status(408).json({ 
                host, 
                port: targetPort, 
                status: 'timeout', 
                message: 'Connection timed out after 5s. Check firewall or IP.' 
            });
        }
    }, 5000);

    conn.on('ready', () => {
        clearTimeout(timeout);
        conn.end();

        if (!responseSent) {
            responseSent = true;
            res.json({ 
                host, 
                port: targetPort, 
                status: 'success', 
                message: 'SSH Connection Established Successfully!' 
            });
        }
    });

    conn.on('error', (err) => {
        clearTimeout(timeout);
        
        if (!responseSent) {
            responseSent = true;
            
            if (err.level === 'client-authentication' || 
                (err.message && err.message.includes('All configured authentication methods failed'))) {
                res.status(401).json({ 
                    host, 
                    port: targetPort, 
                    status: 'auth_failed', 
                    message: 'Server reached, but Authentication Failed. Check username/key.' 
                });
            } else {
                res.status(500).json({ 
                    host, 
                    port: targetPort, 
                    status: 'error', 
                    message: err.message || 'Connection Refused or Host Unreachable'
                });
            }
        }
    });

    try {
        conn.connect({
            host: host.trim(),
            port: targetPort,
            username: username && typeof username === 'string' ? username.trim() : 'root', 
            privateKey: privateKey.trim(), 
            readyTimeout: 5000,
            keepaliveInterval: 1000 
        });
    } catch (e) {
        clearTimeout(timeout);
        if (!responseSent) {
            responseSent = true;
            res.status(500).json({ error: "Failed to initialize SSH client: " + e.message });
        }
    }
};

module.exports = { createKey, getKeysByEnv, deleteKey, testConnection, updateKey };