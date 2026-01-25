const { db } = require('../config/firebase');

const getCommands = async (req, res) => {
    try {
        const { envId } = req.query;
        const userId = req.user.uid;

        if (!envId || typeof envId !== 'string') {
            return res.status(400).json({ error: "Valid envId is required" });
        }

        const snapshot = await db.collection('commands')
            .where("envId", "==", envId)
            .where("userId", "==", userId)
            .get();

        const commands = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                commands.push({ id: doc.id, ...doc.data() });
            });
        }

        res.status(200).json(commands);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const createCommand = async (req, res) => {
    try {
        const { name, command, envId } = req.body;
        const userId = req.user.uid;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }
        if (!command || typeof command !== 'string' || !command.trim()) {
            return res.status(400).json({ error: "Command content is required" });
        }
        if (!envId || typeof envId !== 'string') {
            return res.status(400).json({ error: "envId is required" });
        }

        const envDoc = await db.collection('environments').doc(envId).get();

        if (!envDoc.exists) {
            return res.status(404).json({ error: "Environment not found" });
        }

        if (envDoc.data().userId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const newCommand = {
            name: name.trim(),
            command: command.trim(),
            envId,
            userId,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('commands').add(newCommand);
        res.status(201).json({ id: docRef.id, ...newCommand });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateCommand = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, command } = req.body;
        const updates = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ error: "Name must be a valid string" });
            }
            updates.name = name.trim();
        }

        if (command !== undefined) {
            if (typeof command !== 'string' || !command.trim()) {
                return res.status(400).json({ error: "Command must be a valid string" });
            }
            updates.command = command.trim();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update" });
        }

        const docRef = db.collection('commands').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Command not found" });

        if (doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await docRef.update(updates);

        res.status(200).json({ id, ...doc.data(), ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const deleteCommand = async (req, res) => {
    try {
        const { id } = req.params;

        const docRef = db.collection('commands').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Command not found" });

        if (doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await docRef.delete();

        res.status(200).json({ message: "Command deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getCommands, createCommand, updateCommand, deleteCommand };