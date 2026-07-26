import { Request, Response } from "express";
import { db } from "../../config/db";

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

export const getMe = async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const requestedId = req.params.userId;
    const targetUserId =
      (typeof requestedId === "string" && requestedId !== "me"
        ? requestedId
        : req.user?.userId) as string;

    if (!targetUserId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user = await db.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        username: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
        createdAt: true,

        submissions: {
          orderBy: {
            submittedAt: "desc",
          },
          take: 7,
          select: {
            id: true,
            submittedAt: true,
            status: true,
            verdict: true,
            problem: {
              select: {
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const recentMatches = await db.match.findMany({
      where: {
        OR: [{ player1Id: targetUserId }, { player2Id: targetUserId }],
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
      win: match.winnerId === targetUserId,
    }));

    const ratingHistory = await db.ratingHistory.findMany({
      where: {
        userId: targetUserId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        rating: true,
        delta: true,
        createdAt: true,
        matchId: true,
      },
    });

    // If no rating history records exist yet, construct an initial entry based on baseline rating
    const formattedRatingHistory =
      ratingHistory.length > 0
        ? ratingHistory
        : [
            {
              id: "initial",
              rating: user.rating || 1200,
              delta: 0,
              createdAt: user.createdAt,
              matchId: null,
            },
          ];

    return res.status(200).json({
      user,
      formattedRecentMatches,
      ratingHistory: formattedRatingHistory,
    });
  } catch (error) {
    console.error("Dashboard/Profile Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const { name, username, country } = req.body;

  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (
      name === undefined &&
      username === undefined &&
      country === undefined
    ) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const updateData: {
      name?: string;
      username?: string;
      country?: string;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (country !== undefined) {
      updateData.country = country;
    }

    if (username !== undefined) {
      const trimmedUsername = username.trim();

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
        avatar: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
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

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { emailVerified: true },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
      },
    });

    return res.status(200).json({
      message: "Email verified successfully! Blue badge unlocked.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Verify Email Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const linkOAuth = async (req: Request, res: Response) => {
  const { provider } = req.body; // "google" or "github"

  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (provider !== "google" && provider !== "github") {
      return res.status(400).json({ message: "Provider must be 'google' or 'github'." });
    }

    const mockId = `${provider}_${Math.random().toString(36).substring(2, 10)}`;
    const updateData = provider === "google" ? { googleId: mockId } : { githubId: mockId };

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
      },
    });

    return res.status(200).json({
      message: `${provider === "google" ? "Google" : "GitHub"} account linked successfully!`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Link OAuth Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
