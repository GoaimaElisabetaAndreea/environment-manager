const { db } = require('../config/firebase');

const createKey = async (req, res) => {
    try {
        const { title, value, envId } = req.body;
        
        if (!title || !value || !envId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newKey = {
            title,
            value,
            envId,
            userId: req.user.uid, 
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('ssh_keys').add(newKey);
        res.status(201).json({ id: docRef.id, ...newKey });
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
            keys.push({ id: doc.id, ...doc.data() });
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

module.exports = { createKey, getKeysByEnv, deleteKey };