const { db } = require('../config/firebase');

const getCommands = async(req, res) => {
    try {
        const { envId } = req.query;

        if(!envId) return res.status(400).json({error: "envId is required"});

        const snapshot = await db.collection('commands').where("envId", "==", envId).get();

        const commands = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                commands.push({id: doc.id, ...doc.data()});
            });
        }

        res.status(200).json(commands);  
    } catch(error){
        res.status(500).json({error: error.message});
    }  
}

const createCommand = async(req, res) => {
    try {
        const commandData = req.body;

        const newCommand = {
            ...commandData,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('commands').add(newCommand);
        res.status(201).json({ id: docRef.id, ...newCommand });
    } catch(error){
        res.status(500).json({error: error.message});
    } 
}

const updateCommand = async(req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const docRef = db.collection('commands').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Command not found" });

        await docRef.update(data);

        res.status(200).json({ id, ...doc.data(), ...data });  
    } catch(error){
        res.status(500).json({error: error.message});
    } 
}

const deleteCommand = async(req, res) => {
    try {
        const { id } = req.params;
        await db.collection('commands').doc(id).delete();
        res.status(200).json({ message: "Command deleted" });
    } catch(error){
        res.status(500).json({error: error.message});
    } 
}

module.exports = { getCommands, createCommand, updateCommand, deleteCommand };