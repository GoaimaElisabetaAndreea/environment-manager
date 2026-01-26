const { db } = require('../config/firebase');

const getCommands = async (req, res) => {
    try {
        const { envId, page = 1, limit = 5, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const userId = req.user.uid;

        if (!envId) return res.status(400).json({ error: "envId required" });

        const limitInt = parseInt(limit);
        const offset = (parseInt(page) - 1) * limitInt;

        let query = db.collection('commands')
            .where("envId", "==", envId)
            .where("userId", "==", userId);

        query = query.orderBy(sortBy, sortOrder === 'desc' ? 'desc' : 'asc');

        const countSnapshot = await db.collection('commands')
            .where("envId", "==", envId)
            .where("userId", "==", userId)
            .count()
            .get();

        const snapshot = await query.limit(limitInt).offset(offset).get();

        const commands = [];
        snapshot.forEach(doc => commands.push({ id: doc.id, ...doc.data() }));
        
        res.status(200).json({
            data: commands,
            total: countSnapshot.data().count,
            page: parseInt(page),
            limit: limitInt,
            totalPages: Math.ceil(countSnapshot.data().count / limitInt)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

const createCommand = async (req, res) => {
    try {
        const { name, command, envId, description, flags } = req.body;
        const userId = req.user.uid;

        if (!name || !command || !envId) {
            return res.status(400).json({ error: "Name, Command and EnvID are required" });
        }

        const newCommand = {
            name,
            command,
            description: description || '',
            flags: flags || [],
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
        const { name, command, description, flags } = req.body;
        
        const updates = {};

        if (name !== undefined) updates.name = name;
        if (command !== undefined) updates.command = command;
        if (description !== undefined) updates.description = description;
        if (flags !== undefined) updates.flags = flags;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const docRef = db.collection('commands').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Not found" });
        if (doc.data().userId !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

        await docRef.update(updates);
        
        res.status(200).json({ ...doc.data(), ...updates, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const deleteCommand = async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('commands').doc(id);
        await docRef.delete();
        res.status(200).json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getCommands, createCommand, updateCommand, deleteCommand };