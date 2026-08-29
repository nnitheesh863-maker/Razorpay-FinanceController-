import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initSocket } from './services/socket.service';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

initSocket(io);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
