import { Server, Socket } from "socket.io";
import { db } from "../../config/db";
import { isUserConnected, getSocket } from "../../socket/socketManager";
import { startMatch } from "../match/match.service";
import { QueuePlayer } from "../matchmaking/matchmaking.types";

interface PendingChallenge {
  id: string;
  challengerId: string;
  recipientId: string;
  difficulty?: string;
  createdAt: number;
  timer: NodeJS.Timeout;
}

const activeChallenges = new Map<string, PendingChallenge>();

export const initializeFriendsSocket = (io: Server, socket: Socket) => {
  const currentUserId = socket.data.user?.id;
  if (!currentUserId) return;

  // Send a direct duel challenge to a friend
  socket.on("friend:challenge_send", async (data: { targetUserId: string; difficulty?: string }) => {
    try {
      const { targetUserId, difficulty } = data;

      if (!targetUserId) {
        socket.emit("friend:challenge_error", { message: "Target user ID is required" });
        return;
      }

      if (targetUserId === currentUserId) {
        socket.emit("friend:challenge_error", { message: "You cannot challenge yourself" });
        return;
      }

      if (!isUserConnected(targetUserId)) {
        socket.emit("friend:challenge_error", { message: "User is currently offline" });
        return;
      }

      // Verify they are friends
      const friendship = await db.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { senderId: currentUserId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: currentUserId },
          ],
        },
      });

      if (!friendship) {
        socket.emit("friend:challenge_error", { message: "You can only challenge users on your friends list" });
        return;
      }

      // Fetch challenger details
      const challenger = await db.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true },
      });

      if (!challenger) return;

      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Set 30-second timeout for challenge
      const timer = setTimeout(() => {
        if (activeChallenges.has(challengeId)) {
          activeChallenges.delete(challengeId);
          io.to(`user:${currentUserId}`).emit("friend:challenge_expired", { challengeId });
          io.to(`user:${targetUserId}`).emit("friend:challenge_expired", { challengeId });
        }
      }, 30000);

      const challenge: PendingChallenge = {
        id: challengeId,
        challengerId: currentUserId,
        recipientId: targetUserId,
        difficulty,
        createdAt: Date.now(),
        timer,
      };

      activeChallenges.set(challengeId, challenge);

      // Emit to recipient
      io.to(`user:${targetUserId}`).emit("friend:challenge_received", {
        challengeId,
        challenger,
        difficulty: difficulty || "BALANCED",
        expiresInMs: 30000,
      });

      // Confirm to challenger
      socket.emit("friend:challenge_sent", {
        challengeId,
        targetUserId,
        expiresInMs: 30000,
      });
    } catch (error: any) {
      console.error("friend:challenge_send error:", error);
      socket.emit("friend:challenge_error", { message: "Failed to send challenge" });
    }
  });

  // Accept a duel challenge
  socket.on("friend:challenge_accept", async (data: { challengeId: string }) => {
    try {
      const { challengeId } = data;
      const challenge = activeChallenges.get(challengeId);

      if (!challenge) {
        socket.emit("friend:challenge_error", { message: "Challenge expired or no longer exists" });
        return;
      }

      if (challenge.recipientId !== currentUserId) {
        socket.emit("friend:challenge_error", { message: "Unauthorized challenge response" });
        return;
      }

      // Clear challenge timer and remove from map
      clearTimeout(challenge.timer);
      activeChallenges.delete(challengeId);

      // Fetch user profiles for both players
      const challengerUser = await db.user.findUnique({
        where: { id: challenge.challengerId },
        select: { id: true, avatar_url: true, avatar_id: true, rating: true },
      });

      const recipientUser = await db.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, avatar_url: true, avatar_id: true, rating: true },
      });

      if (!challengerUser || !recipientUser) {
        socket.emit("friend:challenge_error", { message: "User account missing" });
        return;
      }

      const challengerSocket = getSocket(challengerUser.id);
      const recipientSocket = getSocket(recipientUser.id);

      const player1: QueuePlayer = {
        userId: challengerUser.id,
        socketId: challengerSocket?.id || "",
        avatar_url: challengerUser.avatar_url,
        avatar_id: challengerUser.avatar_id,
        rating: challengerUser.rating,
        joinedAt: Date.now(),
      };

      const player2: QueuePlayer = {
        userId: recipientUser.id,
        socketId: recipientSocket?.id || "",
        avatar_url: recipientUser.avatar_url,
        avatar_id: recipientUser.avatar_id,
        rating: recipientUser.rating,
        joinedAt: Date.now(),
      };

      // Start match via existing match service
      await startMatch(io, player1, player2);
    } catch (error: any) {
      console.error("friend:challenge_accept error:", error);
      socket.emit("friend:challenge_error", { message: "Failed to start match" });
    }
  });

  // Decline a duel challenge
  socket.on("friend:challenge_decline", async (data: { challengeId: string }) => {
    try {
      const { challengeId } = data;
      const challenge = activeChallenges.get(challengeId);

      if (!challenge) return;

      clearTimeout(challenge.timer);
      activeChallenges.delete(challengeId);

      if (challenge.challengerId === currentUserId) {
        // If challenger declined/cancelled, notify recipient
        io.to(`user:${challenge.recipientId}`).emit("friend:challenge_cancelled", { challengeId });
      } else {
        // Recipient declined, notify challenger
        io.to(`user:${challenge.challengerId}`).emit("friend:challenge_declined", {
          recipientId: currentUserId,
          challengeId,
        });
      }
    } catch (error: any) {
      console.error("friend:challenge_decline error:", error);
    }
  });

  // Cancel a duel challenge (by challenger)
  socket.on("friend:challenge_cancel", async (data: { challengeId: string }) => {
    try {
      const { challengeId } = data;
      const challenge = activeChallenges.get(challengeId);

      if (!challenge) return;
      if (challenge.challengerId !== currentUserId) return;

      clearTimeout(challenge.timer);
      activeChallenges.delete(challengeId);

      // Notify recipient that challenge was cancelled by challenger
      io.to(`user:${challenge.recipientId}`).emit("friend:challenge_cancelled", { challengeId });
    } catch (error: any) {
      console.error("friend:challenge_cancel error:", error);
    }
  });
};

export const cleanUserChallenges = (io: Server, userId: string) => {
  for (const [challengeId, challenge] of activeChallenges.entries()) {
    if (challenge.challengerId === userId) {
      clearTimeout(challenge.timer);
      activeChallenges.delete(challengeId);
      io.to(`user:${challenge.recipientId}`).emit("friend:challenge_cancelled", { challengeId });
    } else if (challenge.recipientId === userId) {
      clearTimeout(challenge.timer);
      activeChallenges.delete(challengeId);
      io.to(`user:${challenge.challengerId}`).emit("friend:challenge_declined", {
        recipientId: userId,
        challengeId,
      });
    }
  }
};

