import { Request, Response } from "express";
import { db } from "../config/db";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const id = req.user?.userId;

    if (!id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user = await db.user.findUnique({
      where: {
        id,
      },
    });

    const problems = await db.problem.findMany({
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        topics: {
          select: {
            name: true,
          },
        },
      },
      take: 15,
    });

    const recentMatches = await db.match.findMany({
      where: {
        OR: [{ player1Id: id }, { player2Id: id }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        status: true,
        player1Id: true,
        player2Id: true,
        winnerId: true,
        problem: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    const formattedRecentMatches = recentMatches.map((match) => ({
      ...match,
      win: match.winnerId === id,
    }));

    const response = {
      user: {
        id: user?.id,
        username: user?.username,
        email: user?.email,
        avatar: user?.avatar,
        rating: user?.rating,
        wins: user?.wins,
        losses: user?.losses,
        matchesPlayed: user?.matchesPlayed,
      },
      problems,
      recentMatches: formattedRecentMatches,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Dashboard Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};