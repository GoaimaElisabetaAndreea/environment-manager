const { db } = require('../config/firebase');
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
        const { title, value, envId } = req.body;
        
        if (!title || !value || !envId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const encryptedValue = encrypt(value);
        const newKey = {
            title,
            value: encryptedValue,
            envId,
            userId: req.user.uid, 
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('ssh_keys').add(newKey);
        res.status(201).json({ id: docRef.id, ...newKey, value: value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getKeysByEnv = async (req, res) => {
    try {
        const { envId } = req.params;
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
    const { host, port } = req.body;

    if(!host) return res.status(400).json({error: 'Host required'});

    const targetPort = port || 22;
    const timeout = 3000; // 3 secunde timeout

    const socket = new net.Socket();
    let status = 'closed';

    socket.setTimeout(timeout);

    socket.on('connect', () => {
        status = 'open';
        socket.destroy();
    });

    socket.on('timeout', () => {
        status = 'timeout';
        socket.destroy();
    });

    socket.on('error', (err) => {
        status = 'error';
    });

    socket.on('close', () => {
        res.json({ host, port: targetPort, status });
    });

    socket.connect(targetPort, host);
};

module.exports = { createKey, getKeysByEnv, deleteKey, testConnection };