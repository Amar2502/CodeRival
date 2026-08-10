import { Request, Response, NextFunction } from "express";
import { getMatch } from "./match.service";
import { db } from "../../config/db";
import { NotFoundError } from "../../utils/errors";

export class MatchController {
  static async getMatchById(req: Request, res: Response, next: NextFunction) {
    try {
      const matchId = req.params.id as string;
      const userId = (req as any).user?.id || (req as any).user?.userId;
      const match = await getMatch(matchId);

      if (!match) {
        throw new NotFoundError("Match not found");
      }

      const isParticipant = match.player1Id === userId || match.player2Id === userId;
      const isTournamentMatch = (match as any).tournamentMatches && (match as any).tournamentMatches.length > 0;

      if (!isParticipant && !isTournamentMatch) {
        res.status(403).json({
          success: false,
          message: "Access denied. You are not a participant in this 1v1 battle.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: match,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserMatchHistory(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
      const limit = req.query.limit ? Math.max(1, parseInt(String(req.query.limit), 10)) : 20;
      const skip = (page - 1) * limit;

      const totalMatches = await db.match.count({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
        },
      });

      const matches = await db.match.findMany({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          player1: { select: { id: true, username: true, avatar_url: true, avatar_id: true, rating: true } },
          player2: { select: { id: true, username: true, avatar_url: true, avatar_id: true, rating: true } },
          problem: { select: { id: true, title: true, slug: true, difficulty: true } },
          winner: { select: { id: true, username: true } },
        },
        skip,
        take: limit,
      });

      res.status(200).json({
        success: true,
        data: matches,
        hasMore: skip + matches.length < totalMatches,
        pagination: {
          page,
          limit,
          total: totalMatches,
          hasMore: skip + matches.length < totalMatches,
        },
      });
    } catch (error) {
      NextFunction(error);
    }
  }

  static async getActiveMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const activeMatch = await db.match.findFirst({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: "ACTIVE",
        },
        include: {
          player1: { select: { id: true, username: true, avatar_url: true, avatar_id: true, rating: true } },
          player2: { select: { id: true, username: true, avatar_url: true, avatar_id: true, rating: true } },
          problem: {
            include: {
              examples: { orderBy: { order: "asc" } },
              topics: true,
              signature: true,
              starterCodes: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: activeMatch || null,
      });
    } catch (error) {
      next(error);
    }
  }
}
