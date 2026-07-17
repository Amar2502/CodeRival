import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { authSocket } from "./middleware/auth.socket";
import { connectUser, disconnectUser } from "./socketManager";

let io: Server;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Authenticate BEFORE connection
  io.use(authSocket);

  io.on("connection", (socket) => {
    console.log(`Connected: ${socket.id}`);
    connectUser(socket.data.user.id, socket.id);
    console.log(`User: ${socket.data.user.id}`);

    socket.on("disconnect", () => {
      console.log(`Disconnected: ${socket.id}`);
      disconnectUser(socket.data.user.id);
    });
  });
};

export { io };