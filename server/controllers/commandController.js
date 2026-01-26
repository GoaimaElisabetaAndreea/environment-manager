const { db } = require('../config/firebase');

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

const getCommands = async (req, res) => {
    try {
        const { envId } = req.params; 
        const { page = 1, limit = 9, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const userId = req.user.uid;

        const envRef = await validateEnvironmentAccess(envId, userId);
        
        const commandsRef = envRef.collection('commands');

        const pageInt = parseInt(page) > 0 ? parseInt(page) : 1;
        const limitInt = parseInt(limit) > 0 ? parseInt(limit) : 9;
        
        const validSortFields = ['name', 'createdAt', 'updatedAt'];
        const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

        const countSnapshot = await commandsRef.count().get();

        // how many commands to skip based on the page
        const offset = (pageInt - 1) * limitInt;

        const snapshot = await commandsRef
            .orderBy(safeSortBy, safeSortOrder)
            .limit(limitInt)
            .offset(offset)
            .get();

        const commands = [];
        snapshot.forEach(doc => commands.push({ id: doc.id, ...doc.data() }));
        
        res.status(200).json({
            data: commands,
            total: countSnapshot.data().count,
            page: pageInt,
            limit: limitInt,
            totalPages: Math.ceil(countSnapshot.data().count / limitInt)
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
}

const createCommand = async (req, res) => {
    try {
        const { envId } = req.params;
        const { name, command, description, flags } = req.body;
        const userId = req.user.uid;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: "Name is required and must be at least 2 characters." });
        }
        if (!command || typeof command !== 'string' || command.trim().length === 0) {
            return res.status(400).json({ error: "Command script is required." });
        }

        const envRef = await validateEnvironmentAccess(envId, userId);

        const newCommand = {
            name: name.trim(), 
            description: description ? description.trim() : '',
            command: command.trim(),   
            flags: Array.isArray(flags) ? flags : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await envRef.collection('commands').add(newCommand);

        res.status(201).json({ id: docRef.id, ...newCommand });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

const updateCommand = async (req, res) => {
    try {
        const { envId, cmdId } = req.params;
        const { name, command, description, flags } = req.body;
        const userId = req.user.uid;
        
        if (!cmdId) return res.status(400).json({ error: "Command ID is required" });

        const envRef = await validateEnvironmentAccess(envId, userId);
        const commandRef = envRef.collection('commands').doc(cmdId);

        const commandDoc = await commandRef.get();
        if (!commandDoc.exists) {
            return res.status(404).json({ error: "Command not found" });
        }

        const updates = {
            updatedAt: new Date().toISOString()
        };

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2) {
                return res.status(400).json({ error: "Name must be at least 2 characters." });
            }
            updates.name = name.trim();
        }

        if (command !== undefined) {
            if (typeof command !== 'string' || command.trim().length === 0) {
                return res.status(400).json({ error: "Command script cannot be empty." });
            }
            updates.command = command.trim();
        }

        if (description !== undefined) updates.description = description.trim();
        if (flags !== undefined && Array.isArray(flags)) updates.flags = flags;

        await commandRef.update(updates);
        
        const updatedDoc = await commandRef.get();
        res.status(200).json({ id: cmdId, ...updatedDoc.data() });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
}

const deleteCommand = async (req, res) => {
    try {
        const { envId, cmdId } = req.params;
        const userId = req.user.uid;

        if (!cmdId) return res.status(400).json({ error: "Command ID is required" });

        const envRef = await validateEnvironmentAccess(envId, userId);
        const commandRef = envRef.collection('commands').doc(cmdId);
        
        const doc = await commandRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Command not found" });
        }

        await commandRef.delete();

        res.status(200).json({ message: "Command deleted successfully" });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

module.exports = { getCommands, createCommand, updateCommand, deleteCommand };