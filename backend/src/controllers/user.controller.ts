import { Request, Response } from "express";
import { db } from "../config/db";

export const checkUsername = async (req: Request, res: Response) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ message: "Username required" });
  }

  const user = await db.user.findUnique({
    where: { username: String(username) },
  });

  return res.status(200).json({ available: !user });
};

export const getMe = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    user: {
      id: req.user.userId,
      username: req.user.username,
      email: req.user.email,
    },
  });
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        username: true,

        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,

        country: true,

        googleId: true,
        githubId: true,
        emailVerified: true,

        submissions: {
          where: {
            userId: userId,
          },
          orderBy: {
            submittedAt: "desc",
          },
          take: 7,
          select: {
            id: true,
            submittedAt: true,
            problem: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const recentMatches = await db.match.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 7,
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
      win: match.winnerId === userId,
    }));

    return res.status(200).json({
      user,
      formattedRecentMatches,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const { name, username } = req.body;

  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // At least one field must be provided
    if (name === undefined && username === undefined) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const updateData: {
      name?: string;
      username?: string;
    } = {};

    // Update name if provided
    if (name !== undefined) {
      updateData.name = name;
    }

    // Update username if provided
    if (username !== undefined) {
      const trimmedUsername = username.trim();

      // Check if username is already taken by another user
      const existingUser = await db.user.findUnique({
        where: {
          username: trimmedUsername,
        },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          message: "Username is already taken.",
        });
      }

      updateData.username = trimmedUsername;
    }

    const updatedUser = await db.user.update({
      where: {
        id: userId,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
