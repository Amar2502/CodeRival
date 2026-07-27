import { Request, Response } from "express";
import {
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  syncGlobalLeaderboard,
} from "./leaderboard.service";

export const getGlobalLeaderboardController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

    const data = await getGlobalLeaderboard(userId, limit);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("getGlobalLeaderboardController error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getFriendsLeaderboardController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await getFriendsLeaderboard(userId);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("getFriendsLeaderboardController error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const syncLeaderboardController = async (req: Request, res: Response) => {
  try {
    await syncGlobalLeaderboard();
    return res.status(200).json({ message: "Global leaderboard successfully synced to Redis" });
  } catch (error: any) {
    console.error("syncLeaderboardController error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};
