require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const verifyToken = require('./middleware/authMiddleware'); 
const { createKey, getKeysByEnv, deleteKey, testConnection, updateKey } = require('./controllers/sshKeyController'); 
const { getEnvironments, createEnvironments, updateEnvironment, deleteEnvironment } = require('./controllers/environmentController');
const { getCommands, createCommand, updateCommand, deleteCommand } = require('./controllers/commandController');
const { createSecret, getSecretMetaData, revealSecret } = require('./controllers/secretController');
const { checkUrlStatus } = require('./controllers/statusController');

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

apiRouter.post('/ssh-keys', createKey);
apiRouter.get('/ssh-keys/:envId', getKeysByEnv);
apiRouter.delete('/ssh-keys/:id', deleteKey);
apiRouter.put('/ssh-keys/:id', updateKey)
apiRouter.post('/ssh-keys/test', testConnection);

apiRouter.get('/environments', getEnvironments);
apiRouter.post('/environments', createEnvironments);
apiRouter.put('/environments/:id', updateEnvironment);
apiRouter.delete('/environments/:id', deleteEnvironment);

apiRouter.get('/commands', getCommands); 
apiRouter.post('/commands', createCommand);
apiRouter.put('/commands/:id', updateCommand);
apiRouter.delete('/commands/:id', deleteCommand);

apiRouter.post('/secrets', createSecret);

apiRouter.post('/status/check', checkUrlStatus);

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.json({ message: "Server is running..." });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});