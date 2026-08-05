import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { authSocket } from "./middleware/auth.socket";
import { connectUser, disconnectUser } from "./socketManager";
import { initializeMatchmakingSocket } from "../modules/matchmaking/matchmaking.socket";
import { initializeMatchSocket } from "../modules/match/match.socket";
import { initializeFriendsSocket, cleanUserChallenges } from "../modules/friends/friends.socket";
import { initializeTournamentSocket } from "../modules/tournament/tournament.socket";
import { leaveQueue, initMatchmakingTicker } from "../modules/matchmaking/matchmaking.service";
import { handlePlayerMatchDisconnect } from "../modules/match/match.service";
import { config } from "../config/config";

let io: Server;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  // Authenticate BEFORE connection
  io.use(authSocket);

  // Initialize background matchmaking ticker
  initMatchmakingTicker(io);

  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    console.log(`Connected: ${socket.id} (User: ${userId})`);

    socket.join(`user:${userId}`);
    connectUser(userId, socket);
    initializeMatchmakingSocket(io, socket);
    initializeMatchSocket(io, socket);
    initializeFriendsSocket(io, socket);
    initializeTournamentSocket(io, socket);

    socket.on("disconnect", async () => {
      console.log(`Disconnected: ${socket.id} (User: ${userId})`);

      // 1. Remove user from matchmaking queue if waiting
      await leaveQueue(userId);

      // 2. Handle disconnect grace period if user is in an active match
      await handlePlayerMatchDisconnect(io, userId);

      // 3. Clean up pending friend challenges for disconnected user
      cleanUserChallenges(io, userId);

      // 4. Remove socket tracking
      disconnectUser(userId, socket.id);
    });
  });
};

export const getIO = (): Server | null => {
  return io || null;
};

export { io };