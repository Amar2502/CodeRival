import { Request, Response } from "express";
import {
  searchUsers,
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendsAndRequests,
} from "./friends.service";
import { getIO } from "../../socket";
import { db } from "../../config/db";

export const searchUsersController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const query = String(req.query.q || "");
    const results = await searchUsers(userId, query);
    return res.status(200).json({ results });
  } catch (error: any) {
    console.error("searchUsersController error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getStatusController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const targetUserId = Array.isArray(req.params.targetUserId)
      ? req.params.targetUserId[0]
      : String(req.params.targetUserId);
    const status = await getFriendshipStatus(userId, targetUserId);
    return res.status(200).json({ status });
  } catch (error: any) {
    console.error("getStatusController error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const sendRequestController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { targetUserId, targetUsername } = req.body;
    const targetIdentifier = targetUserId || targetUsername;

    if (!targetIdentifier) {
      return res.status(400).json({ message: "targetUserId or targetUsername is required" });
    }

    const { friendship, targetUser, autoAccepted } = await sendFriendRequest(userId, targetIdentifier);

    // Get current user profile for socket payload
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, avatar: true, rating: true },
    });

    const io = getIO();
    if (io) {
      if (autoAccepted) {
        io.to(`user:${targetUser.id}`).emit("friend:request_accepted", { user: currentUser });
        io.to(`user:${userId}`).emit("friend:request_accepted", { user: targetUser });
      } else {
        io.to(`user:${targetUser.id}`).emit("friend:request_received", {
          friendshipId: friendship.id,
          sender: currentUser,
        });
      }
    }

    return res.status(200).json({
      message: autoAccepted ? "Friend request accepted!" : "Friend request sent successfully",
      friendship,
      status: autoAccepted ? "ACCEPTED" : "PENDING_SENT",
    });
  } catch (error: any) {
    console.error("sendRequestController error:", error);
    return res.status(400).json({ message: error.message || "Failed to send friend request" });
  }
};

export const acceptRequestController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { requestId, senderId } = req.body;
    const identifier = requestId || senderId;

    if (!identifier) {
      return res.status(400).json({ message: "requestId or senderId is required" });
    }

    const friendship = await acceptFriendRequest(userId, identifier);

    // Notify sender over socket
    const io = getIO();
    if (io) {
      io.to(`user:${friendship.senderId}`).emit("friend:request_accepted", {
        user: friendship.receiver,
      });
    }

    return res.status(200).json({ message: "Friend request accepted", friendship });
  } catch (error: any) {
    console.error("acceptRequestController error:", error);
    return res.status(400).json({ message: error.message || "Failed to accept friend request" });
  }
};

export const declineRequestController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { requestId, senderId } = req.body;
    const identifier = requestId || senderId;

    if (!identifier) {
      return res.status(400).json({ message: "requestId or senderId is required" });
    }

    await declineFriendRequest(userId, identifier);
    return res.status(200).json({ message: "Friend request declined" });
  } catch (error: any) {
    console.error("declineRequestController error:", error);
    return res.status(400).json({ message: error.message || "Failed to decline friend request" });
  }
};

export const removeFriendController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { friendId } = req.body;
    if (!friendId) {
      return res.status(400).json({ message: "friendId is required" });
    }

    await removeFriend(userId, friendId);

    const io = getIO();
    if (io) {
      io.to(`user:${friendId}`).emit("friend:removed", { friendId: userId });
    }

    return res.status(200).json({ message: "Friend removed" });
  } catch (error: any) {
    console.error("removeFriendController error:", error);
    return res.status(400).json({ message: error.message || "Failed to remove friend" });
  }
};

export const getFriendsAndRequestsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await getFriendsAndRequests(userId);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("getFriendsAndRequestsController error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};
