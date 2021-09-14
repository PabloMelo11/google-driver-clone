import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';

import Routes from './routes.js';
import { logger } from './logger.js';

const PORT = process.env.PORT || 3333;

const localhostSSL = {
  key: fs.readFileSync('./certificates/key.pem'),
  cert: fs.readFileSync('./certificates/cert.pem'),
};

const routes = new Routes();
const server = https.createServer(localhostSSL, routes.handler.bind(routes));

const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: false,
  },
});

io.on('connection', (socket) => logger.info(`someone connect: ${socket.id}`));

routes.setSocketInstance(io);

const startServer = () => {
  const { address, port } = server.address();

  logger.info(`app running at https://${address}:${port}`);
};

server.listen(PORT, startServer);
