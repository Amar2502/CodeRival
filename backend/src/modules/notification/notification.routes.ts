import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getNotificationsController,
  markReadController,
  deleteNotificationController,
  sendAnnouncementController,
  unsubscribeAnnouncementController,
} from "./notification.controller";

const router = Router();

// Unsubscribe endpoint (can be called via email link)
router.get("/unsubscribe", unsubscribeAnnouncementController);
router.post("/unsubscribe", unsubscribeAnnouncementController);

// Authenticated routes
router.use(authenticate);

router.get("/", getNotificationsController);
router.patch("/read", markReadController);
router.delete("/:id", deleteNotificationController);
router.post("/announcement", sendAnnouncementController);

export default router;
