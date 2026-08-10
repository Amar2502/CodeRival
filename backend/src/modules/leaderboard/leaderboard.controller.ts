import { Request, Response } from "express";
import {
  getGlobalLeaderboard,
  getFriendsLeaderboard,
  syncGlobalLeaderboard,
} from "./leaderboard.service";

export const getGlobalLeaderboardController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const limit = req.query.limit ? Math.max(1, parseInt(String(req.query.limit), 10)) : 20;

    const data = await getGlobalLeaderboard(userId, page, limit);
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

    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const limit = req.query.limit ? Math.max(1, parseInt(String(req.query.limit), 10)) : 20;

    const data = await getFriendsLeaderboard(userId, page, limit);
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
