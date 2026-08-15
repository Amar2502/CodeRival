import { db } from "../../config/db";
import { getIO } from "../../socket";

export type NotificationTypeEnum =
  | "FRIEND_REQUEST_RECEIVED"
  | "FRIEND_REQUEST_ACCEPTED"
  | "RATING_TIER_UPGRADE";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationTypeEnum;
  title: string;
  message: string;
  senderId?: string;
  friendshipId?: string;
}

export const createNotification = async (input: CreateNotificationInput) => {
  try {
    const notification = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        senderId: input.senderId || null,
        friendshipId: input.friendshipId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar_url: true,
            avatar_id: true,
            rating: true,
          },
        },
      },
    });

    // Real-time socket emission
    const io = getIO();
    if (io) {
      io.to(`user:${input.userId}`).emit("notification:new", notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

export const getUserNotifications = async (userId: string) => {
  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar_url: true,
          avatar_id: true,
          rating: true,
        },
      },
    },
  });

  const unreadCount = await db.notification.count({
    where: { userId, isRead: false },
  });

  return { notifications, unreadCount };
};

export const markNotificationsRead = async (userId: string, notificationId?: string) => {
  if (notificationId) {
    await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  } else {
    await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
  return true;
};

export const deleteNotification = async (userId: string, notificationId: string) => {
  await db.notification.deleteMany({
    where: { id: notificationId, userId },
  });
  return true;
};
