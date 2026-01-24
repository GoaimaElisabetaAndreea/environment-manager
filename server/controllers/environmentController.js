const { db } = require('../config/firebase');


const getEnvironments = async (req, res) => {
    try{
        const userId = req.user.uid;
        const snapshot = await db.collection('environments').where('userId', '==', userId).get();
        const environments = [];

        snapshot.forEach(doc => {
            environments.push({id: doc.id});
        })
        
        res.status(200).json(environments);
    } catch(error){
        res.status(500).json({error: error.message});
    }
}

const createEnvironments = async (req, res) => {
    try{
        const { name } = req.body;
        
        if(!name) res.status(400).json({error: "Name is required"});

        const newEnv = {
            name, 
            userId: req.user.uid,
            quickLinks: [],
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('environmemts').add(newEnv);
        res.status(201).json({id: docRef.id, ...newEnv});
    } catch(error){
        res.status(500).json({error: error.message});
    }    
}

const updateEnvironment = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const docRef = db.collection('environments').doc(id);
        const doc = await docRef.get();

        if(!doc.exists) return res.status(404).json({error: "Environment not found"});
   
        if(doc.data().userId !== req.user.uid) return res.status(403).json({error: "Unauthorized"});

        await docRef.update(data);

        res.status(200).json({id, ...doc.data(), ...data});   
    } catch(error){
        res.status(500).json({error: error.message});
    }   
}

const deleteEnvironment = async (req, res) => {
       try {
        const { id } = req.params;

        const docRef = db.collection('environments').doc(id);
        const doc = await docRef.get();

        if(!doc.exists) return res.status(404).json({error: "Environment not found"});

        if(doc.data().userId !== req.user.uid) return res.status(403).json({error: "Unauthorized"});

        await docRef.delete();

        res.status(200).json({ message: "Environment deleted" });  
    } catch(error){
        res.status(500).json({error: error.message});
    }   
}

module.exports = {getEnvironments, createEnvironments, updateEnvironment, deleteEnvironment}