import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getGlobalLeaderboardController,
  getFriendsLeaderboardController,
  syncLeaderboardController,
} from "./leaderboard.controller";

const router = Router();

router.get("/global", getGlobalLeaderboardController);
router.get("/friends", authenticate, getFriendsLeaderboardController);
router.post("/sync", authenticate, syncLeaderboardController);

export default router;
