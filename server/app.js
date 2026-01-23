require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const verifyToken = require('./middleware/authMiddleware'); 
const { createKey, getKeysByEnv, deleteKey } = require('./controllers/sshKeyController'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

const apiRouter = express.Router();
apiRouter.use(verifyToken); 

apiRouter.post('/ssh-keys', createKey);
apiRouter.get('/ssh-keys/:envId', getKeysByEnv);
apiRouter.delete('/ssh-keys/:id', deleteKey);
apiRouter.post('/ssh-keys/test', testConnection);

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.json({ message: "Server is running..." });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});