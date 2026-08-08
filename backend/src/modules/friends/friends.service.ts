import { db } from "../../config/db";
import { FriendshipStatus } from "../../generated/prisma/client";
import { isUserConnected } from "../../socket/socketManager";

export type RelationshipStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED";

export const searchUsers = async (currentUserId: string, query: string) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim();

  // Search users matching username or name, excluding current user
  const users = await db.user.findMany({
    where: {
      id: { not: currentUserId },
      OR: [
        { username: { contains: cleanQuery, mode: "insensitive" } },
        { name: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar_url: true,
      avatar_id: true,
      rating: true,
      wins: true,
      losses: true,
    },
    take: 20,
  });

  if (users.length === 0) {
    return [];
  }

  const userIds = users.map((u) => u.id);

  // Fetch all friendships involving current user and matching users
  const friendships = await db.friendship.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: { in: userIds } },
        { receiverId: currentUserId, senderId: { in: userIds } },
      ],
    },
  });

  const friendshipMap = new Map<string, { status: FriendshipStatus; senderId: string }>();
  friendships.forEach((f) => {
    const otherId = f.senderId === currentUserId ? f.receiverId : f.senderId;
    friendshipMap.set(otherId, { status: f.status, senderId: f.senderId });
  });

  return users.map((u) => {
    const rel = friendshipMap.get(u.id);
    let relationshipStatus: RelationshipStatus = "NONE";

    if (rel) {
      if (rel.status === FriendshipStatus.ACCEPTED) {
        relationshipStatus = "ACCEPTED";
      } else if (rel.status === FriendshipStatus.PENDING) {
        relationshipStatus = rel.senderId === currentUserId ? "PENDING_SENT" : "PENDING_RECEIVED";
      }
    }

    return {
      ...u,
      relationshipStatus,
      isOnline: isUserConnected(u.id),
    };
  });
};

export const getFriendshipStatus = async (currentUserId: string, targetUserId: string): Promise<RelationshipStatus> => {
  if (currentUserId === targetUserId) return "NONE";

  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: currentUserId },
      ],
    },
  });

  if (!friendship) return "NONE";

  if (friendship.status === FriendshipStatus.ACCEPTED) {
    return "ACCEPTED";
  }

  if (friendship.status === FriendshipStatus.PENDING) {
    return friendship.senderId === currentUserId ? "PENDING_SENT" : "PENDING_RECEIVED";
  }

  return "NONE";
};

export const sendFriendRequest = async (senderId: string, targetIdentifier: string) => {
  // Find target user by ID or username
  const targetUser = await db.user.findFirst({
    where: {
      OR: [{ id: targetIdentifier }, { username: targetIdentifier }],
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar_url: true,
      avatar_id: true,
      rating: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (targetUser.id === senderId) {
    throw new Error("You cannot send a friend request to yourself");
  }

  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { senderId, receiverId: targetUser.id },
        { senderId: targetUser.id, receiverId: senderId },
      ],
    },
  });

  if (existing) {
    if (existing.status === FriendshipStatus.ACCEPTED) {
      throw new Error("You are already friends");
    }
    if (existing.status === FriendshipStatus.PENDING) {
      if (existing.senderId === senderId) {
        throw new Error("Friend request already sent");
      } else {
        // If target sent us a request earlier, accept it!
        const updated = await db.friendship.update({
          where: { id: existing.id },
          data: { status: FriendshipStatus.ACCEPTED },
        });
        return { friendship: updated, targetUser, autoAccepted: true };
      }
    }

    // If existing status was DECLINED, update it to PENDING with new sender
    const updated = await db.friendship.update({
      where: { id: existing.id },
      data: {
        senderId,
        receiverId: targetUser.id,
        status: FriendshipStatus.PENDING,
      },
    });
    return { friendship: updated, targetUser, autoAccepted: false };
  }

  const friendship = await db.friendship.create({
    data: {
      senderId,
      receiverId: targetUser.id,
      status: FriendshipStatus.PENDING,
    },
  });

  return { friendship, targetUser, autoAccepted: false };
};

export const acceptFriendRequest = async (receiverId: string, identifier: string) => {
  // identifier can be friendship id or sender user id
  let friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { id: identifier, receiverId, status: FriendshipStatus.PENDING },
        { senderId: identifier, receiverId, status: FriendshipStatus.PENDING },
      ],
    },
    include: {
      sender: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true },
      },
    },
  });

  if (!friendship) {
    throw new Error("Friend request not found");
  }

  const updated = await db.friendship.update({
    where: { id: friendship.id },
    data: { status: FriendshipStatus.ACCEPTED },
    include: {
      sender: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true },
      },
      receiver: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true },
      },
    },
  });

  return updated;
};

export const declineFriendRequest = async (userId: string, identifier: string) => {
  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { id: identifier, senderId: userId },
        { id: identifier, receiverId: userId },
        { senderId: identifier, receiverId: userId },
        { receiverId: identifier, senderId: userId },
      ],
    },
  });

  if (!friendship) {
    throw new Error("Friend request not found");
  }

  await db.friendship.delete({
    where: { id: friendship.id },
  });

  return friendship;
};

export const removeFriend = async (userId: string, friendId: string) => {
  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
    },
  });

  if (!friendship) {
    throw new Error("Friendship not found");
  }

  await db.friendship.delete({
    where: { id: friendship.id },
  });

  return { success: true };
};

export const getFriendsAndRequests = async (userId: string) => {
  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true, wins: true, losses: true },
      },
      receiver: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true, wins: true, losses: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const friends: any[] = [];
  const incomingRequests: any[] = [];
  const outgoingRequests: any[] = [];

  friendships.forEach((f) => {
    if (f.status === FriendshipStatus.ACCEPTED) {
      const friendUser = f.senderId === userId ? f.receiver : f.sender;
      friends.push({
        friendshipId: f.id,
        user: {
          ...friendUser,
          isOnline: isUserConnected(friendUser.id),
        },
        since: f.updatedAt,
      });
    } else if (f.status === FriendshipStatus.PENDING) {
      if (f.receiverId === userId) {
        incomingRequests.push({
          id: f.id,
          sender: {
            ...f.sender,
            isOnline: isUserConnected(f.sender.id),
          },
          createdAt: f.createdAt,
        });
      } else {
        outgoingRequests.push({
          id: f.id,
          receiver: {
            ...f.receiver,
            isOnline: isUserConnected(f.receiver.id),
          },
          createdAt: f.createdAt,
        });
      }
    }
  });

  return { friends, incomingRequests, outgoingRequests };
};
