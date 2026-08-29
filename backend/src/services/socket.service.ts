import { Server } from 'socket.io';

let io: Server | null = null;

export const initSocket = (socketServer: Server) => {
  io = socketServer;

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string || 'anonymous';
    console.log(`Socket client connected. User ID: ${userId}, Socket ID: ${socket.id}`);
    
    // Join user-specific room for targeted events
    socket.join(userId);

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
};

// Emit user-specific real-time notifications
export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(userId).emit(event, data);
    console.log(`Socket emitted event: ${event} to user: ${userId}`);
  }
};

// Emit broadcast alerts
export const emitToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};
