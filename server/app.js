require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { db } = require('./config/firebase');
const app = express();
const port =  process.env.PORT || 3000;

// middleware

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>{
    res.json({message: "Running"})
});

app.listen(port, () => {
    console.log('Server running');
});

