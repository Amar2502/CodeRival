import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  searchUsersController,
  getStatusController,
  sendRequestController,
  acceptRequestController,
  declineRequestController,
  removeFriendController,
  getFriendsAndRequestsController,
} from "./friends.controller";

const router = Router();

router.get("/search", authenticate, searchUsersController);
router.get("/", authenticate, getFriendsAndRequestsController);
router.get("/status/:targetUserId", authenticate, getStatusController);
router.post("/request", authenticate, sendRequestController);
router.post("/accept", authenticate, acceptRequestController);
router.post("/decline", authenticate, declineRequestController);
router.post("/remove", authenticate, removeFriendController);

export default router;
