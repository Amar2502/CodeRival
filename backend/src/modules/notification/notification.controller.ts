import { Request, Response } from "express";
import { db } from "../../config/db";
import { sendAnnouncementEmail } from "../../services/emails/emails.service";
import {
  getUserNotifications,
  markNotificationsRead,
  deleteNotification,
} from "./notification.service";

export const getNotificationsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await getUserNotifications(userId);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("getNotificationsController error:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const markReadController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { notificationId } = req.body;
    await markNotificationsRead(userId, notificationId);

    return res.status(200).json({ message: "Notifications marked as read" });
  } catch (error: any) {
    console.error("markReadController error:", error);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

export const deleteNotificationController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : String(idParam);
    if (!id) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    await deleteNotification(userId, id);
    return res.status(200).json({ message: "Notification deleted" });
  } catch (error: any) {
    console.error("deleteNotificationController error:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};

export const sendAnnouncementController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, message, ctaText, ctaUrl } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // 1. Fetch opted-in users
    const targetUsers = await db.user.findMany({
      where: { notifyEmailAnnouncements: true },
      select: { id: true, email: true, username: true },
    });

    // 2. Respond immediately to keep API non-blocking
    res.status(202).json({
      message: `Announcement dispatch queued for ${targetUsers.length} users`,
      recipientCount: targetUsers.length,
    });

    // 3. Asynchronously dispatch emails in rate-limited background batches
    setImmediate(async () => {
      console.log(`Starting bulk announcement email dispatch to ${targetUsers.length} users...`);
      let sentCount = 0;
      let failCount = 0;

      for (let i = 0; i < targetUsers.length; i++) {
        const u = targetUsers[i];
        try {
          await sendAnnouncementEmail(u.email, title, message, ctaText, ctaUrl, u.username);
          sentCount++;
        } catch (e) {
          failCount++;
          console.error(`Failed to send announcement email to ${u.email}:`, e);
        }

        // Delay 50ms per email to adhere to provider rate limits (20 req/s max)
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      console.log(`Announcement email dispatch complete. Sent: ${sentCount}, Failed: ${failCount}`);
    });
  } catch (error: any) {
    console.error("sendAnnouncementController error:", error);
    return res.status(500).json({ message: "Failed to send announcement" });
  }
};

export const unsubscribeAnnouncementController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const emailParam = req.query.email;

    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: { notifyEmailAnnouncements: false },
      });
    } else if (emailParam && typeof emailParam === "string") {
      await db.user.updateMany({
        where: { email: emailParam },
        data: { notifyEmailAnnouncements: false },
      });
    } else {
      return res.status(400).json({ message: "Email or authentication required" });
    }

    return res.status(200).json({ message: "Successfully unsubscribed from announcement emails" });
  } catch (error: any) {
    console.error("unsubscribeAnnouncementController error:", error);
    return res.status(500).json({ message: "Failed to unsubscribe" });
  }
};
