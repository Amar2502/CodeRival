import { Server, Socket } from "socket.io";
import { db } from "../../config/db";
import { joinQueue, leaveQueue } from "./matchmaking.service";
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
          rating: true,
          avatar: true,
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
        socketId: socket.id,
        rating: user.rating,
        avatar: user.avatar ?? "",
        joinedAt: Date.now(),
      };

      const result = await joinQueue(player);

      if (!result.success) {
        socket.emit("matchmaking:error", {
          message: result.message,
        });
        return;
      }

      if (!result.matched || !result.opponent) {
        socket.emit("matchmaking:searching", {
          joinedAt: player.joinedAt,
          rating: player.rating,
        });
        return;
      }

      // Both players ready - start match directly
      await startMatch(io, player, result.opponent);

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
    } catch (error) {
      console.error("Matchmaking leave error:", error);
    }
  });
};