require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const verifyToken = require('./middleware/authMiddleware'); 
const { 
    getEnvironments, 
    createEnvironments, 
    updateEnvironment, 
    deleteEnvironment
} = require('./controllers/environmentController');
const { createSecret, getSecretMetaData, revealSecret } = require('./controllers/secretController');
const { checkUrlStatus } = require('./controllers/statusController');
const { 
    createKey, 
    getKeysByEnv,    
    updateKey, 
    deleteKey, 
    testConnection 
} = require('./controllers/sshKeyController');
const { getCommands, createCommand, updateCommand, deleteCommand } = require('./controllers/commandController');
const app = express();
const port = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const publicRouter = express.Router();
publicRouter.get('/secrets/:id/meta', getSecretMetaData);
publicRouter.post('/secrets/:id/reveal', revealSecret);
app.use('/api', publicRouter);

const apiRouter = express.Router();
apiRouter.use(verifyToken); 

apiRouter.get('/environments', getEnvironments);
apiRouter.post('/environments', createEnvironments);
apiRouter.put('/environments/:id', updateEnvironment);
apiRouter.delete('/environments/:id', deleteEnvironment);
apiRouter.post('/ssh-keys/test', testConnection); 

apiRouter.get('/environments/:envId/commands', getCommands); 
apiRouter.post('/environments/:envId/commands', createCommand);
apiRouter.put('/environments/:envId/commands/:cmdId', updateCommand);
apiRouter.delete('/environments/:envId/commands/:cmdId', deleteCommand);

apiRouter.get('/environments/:envId/ssh-keys', getKeysByEnv);
apiRouter.post('/environments/:envId/ssh-keys', createKey);
apiRouter.put('/environments/:envId/ssh-keys/:keyId', updateKey);
apiRouter.delete('/environments/:envId/ssh-keys/:keyId', deleteKey);
apiRouter.post('/ssh-keys/test', testConnection);

apiRouter.post('/secrets', createSecret);
apiRouter.post('/status/check', checkUrlStatus);

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.json({ message: "Server is running..." });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});