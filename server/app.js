require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { admin } = require('./config/firebase');
const app = express();
const port =  process.env.PORT || 3000;

// middleware

const verifyToken = async(req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try{
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;

        next();
    } catch(error){
        console.error("Error verifying token:", error);
        return res.status(403).json({error: 'Unauthorized: Invalid token'})
    }
}

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>{
    res.json({message: "Running"})
});

app.listen(port, () => {
    console.log('Server running');
});

