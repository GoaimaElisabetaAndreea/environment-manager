require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const verifyToken = require('./middleware/authMiddleware'); 
const { createKey, getKeysByEnv, deleteKey, testConnection } = require('./controllers/sshKeyController'); 
const { getEnvironments, createEnvironments, updateEnvironment, deleteEnvironment } = require('./controllers/environmentController');
const { getCommands, createCommand, deleteCommand } = require('./controllers/commandController');
const { createSecret, getSecretMetaData, revealSecret } = require('./controllers/secretController');

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
apiRouter.post('/ssh-keys/test', testConnection);

apiRouter.get('/environment', getEnvironments);
apiRouter.post('/environment', createEnvironments);
apiRouter.put('/environment/:id', updateEnvironment);
apiRouter.delete('/environment/:id', deleteEnvironment);

apiRouter.get('/commands', getCommands); 
apiRouter.post('/commands', createCommand);
apiRouter.delete('/commands/:id', deleteCommand);

apiRouter.post('/secrets', createSecret);

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.json({ message: "Server is running..." });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});