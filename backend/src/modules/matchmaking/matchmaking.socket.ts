import { Server, Socket } from "socket.io";
import { db } from "../../config/db";
import { joinQueue, leaveQueue, notifyQueueUpdate } from "./matchmaking.service";
import { QueuePlayer } from "./matchmaking.types";
import { startMatch } from "../match/match.service";

export const initializeMatchmakingSocket = (
  io: Server,
  socket: Socket
) => {
  socket.on("matchmaking:join", async () => {
    try {
      const userId = socket.data.user.id;
      socket.join(`user:${userId}`);

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          rating: true,
          avatar_url: true,
          avatar_id: true,
        },
      });

      if (!user) {
        socket.emit("matchmaking:error", {
          message: "User not found.",
        });
        return;
      }

      const player: QueuePlayer = {
        userId: user.id,
        username: user.username,
        name: user.name,
        socketId: socket.id,
        rating: user.rating,
        avatar_url: user.avatar_url,
        avatar_id: user.avatar_id,
        avatar: user.avatar_url || "",
        joinedAt: Date.now(),
      };

      const result = await joinQueue(player);

      if (!result.success) {
        socket.emit("matchmaking:error", {
          message: result.message,
        });
        return;
      }

      await notifyQueueUpdate(io);

      if (!result.matched || !result.opponent) {
        socket.emit("matchmaking:searching", {
          joinedAt: player.joinedAt,
          rating: player.rating,
        });
        return;
      }

      // Both players ready - start match directly
      await startMatch(io, player, result.opponent);
      await notifyQueueUpdate(io);

    } catch (error) {
      console.error("Matchmaking join error:", error);

      socket.emit("matchmaking:error", {
        message: "Something went wrong during matchmaking.",
      });
    }
  });

  socket.on("matchmaking:leave", async () => {
    try {
      const userId = socket.data.user.id;
      await leaveQueue(userId);
      socket.emit("matchmaking:left");
      await notifyQueueUpdate(io);
    } catch (error) {
      console.error("Matchmaking leave error:", error);
    }
  });
};