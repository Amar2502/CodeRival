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

  static async getUserMatchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

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
        take: 20,
      });
      res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(error);
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
