import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../../config/db";
import { redis } from "../../config/redis";
import { Verdict } from "../../generated/prisma/client";
import { uploadAvatarToImageKit, deleteAvatarFromImageKit } from "../../utils/imagekitUpload";
import { updateUserRatingInLeaderboard, syncGlobalLeaderboard } from "../leaderboard/leaderboard.service";
import { emailService } from "../../services/emails/emails.service";

export const calculateUserProblemsSolved = async (userId: string): Promise<number> => {
  if (!userId) return 0;
  const distinctSolved = await db.submission.findMany({
    where: {
      userId,
      verdict: Verdict.AC,
      submissionType: "SUBMIT",
    },
    select: {
      problemId: true,
    },
    distinct: ["problemId"],
  });
  return distinctSolved.length;
};

export const calculateUserMatchesPlayed = async (userId: string): Promise<number> => {
  if (!userId) return 0;
  return await db.match.count({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: "FINISHED",
    },
  });
};

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
    const userId = req.user.userId;
    const actualSolved = await calculateUserProblemsSolved(userId);
    const actualMatches = await calculateUserMatchesPlayed(userId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar_url: true,
        avatar_id: true,
        country: true,
        gender: true,
        website: true,
        githubHandle: true,
        twitterHandle: true,
        linkedinHandle: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
        appearOnLeaderboard: true,
        allowPublicProfile: true,
        notifySiteFriendRequest: true,
        notifySiteDuelChallenge: true,
        notifySiteMatchTournament: true,
        notifyEmailAnnouncements: true,
        notifyEmailPromotions: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.problemsSolved !== actualSolved || user.matchesPlayed !== actualMatches) {
      await db.user.update({
        where: { id: userId },
        data: {
          problemsSolved: actualSolved,
          matchesPlayed: actualMatches,
        },
      });
      user.problemsSolved = actualSolved;
      user.matchesPlayed = actualMatches;
    }

    const { passwordHash, ...userWithoutPassword } = user;
    const userResponse = {
      ...userWithoutPassword,
      hasPassword: Boolean(passwordHash),
    };

    return res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const requestedId = req.params.userId;
    const currentUserId = req.user?.userId;
    const isMeQuery = !requestedId || requestedId === "me" || requestedId === currentUserId;

    let targetUserId = currentUserId;
    if (!isMeQuery && typeof requestedId === "string") {
      const foundUser = await db.user.findFirst({
        where: { OR: [{ id: requestedId }, { username: requestedId }] },
        select: { id: true },
      });
      if (foundUser) {
        targetUserId = foundUser.id;
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    if (!targetUserId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const isSelf = targetUserId === currentUserId;

    const actualSolved = await calculateUserProblemsSolved(targetUserId);
    const actualMatches = await calculateUserMatchesPlayed(targetUserId);

    const user = await db.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
        avatar_id: true,
        username: true,
        country: true,
        gender: true,
        website: true,
        githubHandle: true,
        twitterHandle: true,
        linkedinHandle: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
        appearOnLeaderboard: true,
        allowPublicProfile: true,
        notifySiteFriendRequest: true,
        notifySiteDuelChallenge: true,
        notifySiteMatchTournament: true,
        notifyEmailAnnouncements: true,
        notifyEmailPromotions: true,
        passwordHash: true,
        createdAt: true,

        submissions: {
          where: {
            submissionType: "SUBMIT",
          },
          orderBy: {
            submittedAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            submittedAt: true,
            status: true,
            verdict: true,
            problem: {
              select: {
                title: true,
                slug: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if public profile is restricted for other users
    if (!isSelf && !user.allowPublicProfile) {
      return res.status(200).json({
        isPrivate: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          avatar_url: user.avatar_url,
          avatar_id: user.avatar_id,
          rating: user.rating,
          allowPublicProfile: false,
          isPrivate: true,
        },
        message: "This user has set their profile to private.",
      });
    }

    if (user.problemsSolved !== actualSolved || user.matchesPlayed !== actualMatches) {
      await db.user.update({
        where: { id: targetUserId },
        data: {
          problemsSolved: actualSolved,
          matchesPlayed: actualMatches,
        },
      });
      user.problemsSolved = actualSolved;
      user.matchesPlayed = actualMatches;
    }

    // Compute global rank using Redis ZSET (100% consistent with Global Leaderboard)
    let globalRank: number | null = null;
    try {
      if (user.appearOnLeaderboard) {
        let revRank = await redis.zrevrank("leaderboard:global", targetUserId);
        if (revRank === null) {
          await updateUserRatingInLeaderboard(targetUserId, user.rating);
          revRank = await redis.zrevrank("leaderboard:global", targetUserId);
        }
        if (revRank !== null) {
          globalRank = revRank + 1;
        }
      }
    } catch (e) {
      console.error("getUserProfile rank error:", e);
      globalRank = null;
    }

    const recentMatches = await db.match.findMany({
      where: {
        OR: [{ player1Id: targetUserId }, { player2Id: targetUserId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        status: true,
        player1Id: true,
        player2Id: true,
        winnerId: true,
        result: true,
        reason: true,
        problem: {
          select: {
            title: true,
            slug: true,
            difficulty: true,
          },
        },
        player1: {
          select: {
            username: true,
            name: true,
          },
        },
        player2: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    const formattedRecentMatches = recentMatches.map((match) => {
      const isPlayer1 = match.player1Id === targetUserId;
      const opponent = isPlayer1 ? match.player2 : match.player1;
      return {
        ...match,
        win: match.winnerId === targetUserId,
        opponent: opponent ? { username: opponent.username, name: opponent.name } : null,
      };
    });

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

    let formattedRatingHistory: any[] = ratingHistory;

    if (ratingHistory.length === 0) {
      formattedRatingHistory = [
        {
          id: "initial",
          rating: user.rating || 1200,
          delta: 0,
          createdAt: user.createdAt,
          matchId: null,
        },
      ];
    } else if (ratingHistory[0].matchId && ratingHistory[0].delta !== null) {
      const initialRating = ratingHistory[0].rating - ratingHistory[0].delta;
      formattedRatingHistory = [
        {
          id: "initial",
          rating: initialRating,
          delta: 0,
          createdAt: user.createdAt,
          matchId: null,
        },
        ...ratingHistory,
      ];
    }

    const { passwordHash, ...userWithoutPassword } = user;
    const userResponse = {
      ...userWithoutPassword,
      hasPassword: Boolean(passwordHash),
      rank: globalRank,
    };

    return res.status(200).json({
      user: userResponse,
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
  const {
    name,
    username,
    country,
    gender,
    website,
    githubHandle,
    twitterHandle,
    linkedinHandle,
    appearOnLeaderboard,
    allowPublicProfile,
    notifySiteFriendRequest,
    notifySiteDuelChallenge,
    notifySiteMatchTournament,
    notifyEmailAnnouncements,
    notifyEmailPromotions,
  } = req.body;

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
      country === undefined &&
      gender === undefined &&
      website === undefined &&
      githubHandle === undefined &&
      twitterHandle === undefined &&
      linkedinHandle === undefined &&
      appearOnLeaderboard === undefined &&
      allowPublicProfile === undefined &&
      notifySiteFriendRequest === undefined &&
      notifySiteDuelChallenge === undefined &&
      notifySiteMatchTournament === undefined &&
      notifyEmailAnnouncements === undefined &&
      notifyEmailPromotions === undefined
    ) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const updateData: {
      name?: string;
      username?: string;
      country?: string | null;
      gender?: string | null;
      website?: string | null;
      githubHandle?: string | null;
      twitterHandle?: string | null;
      linkedinHandle?: string | null;
      appearOnLeaderboard?: boolean;
      allowPublicProfile?: boolean;
      notifySiteFriendRequest?: boolean;
      notifySiteDuelChallenge?: boolean;
      notifySiteMatchTournament?: boolean;
      notifyEmailAnnouncements?: boolean;
      notifyEmailPromotions?: boolean;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (country !== undefined) {
      updateData.country = country;
    }

    if (gender !== undefined) {
      updateData.gender = gender;
    }

    if (website !== undefined) {
      updateData.website = website;
    }

    if (githubHandle !== undefined) {
      updateData.githubHandle = githubHandle;
    }

    if (twitterHandle !== undefined) {
      updateData.twitterHandle = twitterHandle;
    }

    if (linkedinHandle !== undefined) {
      updateData.linkedinHandle = linkedinHandle;
    }

    if (appearOnLeaderboard !== undefined) {
      updateData.appearOnLeaderboard = appearOnLeaderboard;
    }

    if (allowPublicProfile !== undefined) {
      updateData.allowPublicProfile = allowPublicProfile;
    }

    if (notifySiteFriendRequest !== undefined) {
      updateData.notifySiteFriendRequest = notifySiteFriendRequest;
    }

    if (notifySiteDuelChallenge !== undefined) {
      updateData.notifySiteDuelChallenge = notifySiteDuelChallenge;
    }

    if (notifySiteMatchTournament !== undefined) {
      updateData.notifySiteMatchTournament = notifySiteMatchTournament;
    }

    if (notifyEmailAnnouncements !== undefined) {
      updateData.notifyEmailAnnouncements = notifyEmailAnnouncements;
    }

    if (notifyEmailPromotions !== undefined) {
      updateData.notifyEmailPromotions = notifyEmailPromotions;
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
        avatar_url: true,
        avatar_id: true,
        country: true,
        gender: true,
        website: true,
        githubHandle: true,
        twitterHandle: true,
        linkedinHandle: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
        googleId: true,
        githubId: true,
        emailVerified: true,
        appearOnLeaderboard: true,
        allowPublicProfile: true,
        notifySiteFriendRequest: true,
        notifySiteDuelChallenge: true,
        notifySiteMatchTournament: true,
        notifyEmailAnnouncements: true,
        notifyEmailPromotions: true,
        passwordHash: true,
      },
    });

    if (updatedUser.appearOnLeaderboard) {
      await updateUserRatingInLeaderboard(userId, updatedUser.rating);
    } else {
      await redis.zrem("leaderboard:global", userId);
    }

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    const userResponse = {
      ...userWithoutPassword,
      hasPassword: Boolean(passwordHash),
    };

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: userResponse,
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
        avatar_url: true,
        avatar_id: true,
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
        avatar_url: true,
        avatar_id: true,
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

export const uploadAvatarController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { avatar_id: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let fileBuffer: Buffer | string | undefined;

    if (req.file) {
      fileBuffer = req.file.buffer;
    } else if (req.body.avatar_data) {
      fileBuffer = req.body.avatar_data;
    }

    if (!fileBuffer) {
      return res.status(400).json({ message: "No image file or avatar_data provided" });
    }

    const uploadResult = await uploadAvatarToImageKit(fileBuffer, user.avatar_id);

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        avatar_url: uploadResult.avatar_url,
        avatar_id: uploadResult.avatar_id,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar_url: true,
        avatar_id: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
      },
    });

    return res.status(200).json({
      message: "Avatar uploaded successfully",
      user: updatedUser,
      avatar_url: uploadResult.avatar_url,
      avatar_id: uploadResult.avatar_id,
    });
  } catch (error: any) {
    console.error("uploadAvatarController error:", error);
    return res.status(500).json({ message: error.message || "Failed to upload avatar" });
  }
};

export const removeAvatarController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { avatar_id: true },
    });

    if (user?.avatar_id) {
      await deleteAvatarFromImageKit(user.avatar_id);
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        avatar_url: null,
        avatar_id: null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar_url: true,
        avatar_id: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        matchesPlayed: true,
        problemsSolved: true,
      },
    });

    return res.status(200).json({
      message: "Avatar removed successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("removeAvatarController error:", error);
    return res.status(500).json({ message: error.message || "Failed to remove avatar" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.passwordHash) {
      if (!oldPassword) {
        return res.status(400).json({ message: "Old password is required." });
      }
      const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ message: "Incorrect old password." });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAccountController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await db.user.delete({ where: { id: userId } });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendContactForm = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const adminSupportEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || "support@coderival.com";

    // 1. Send support ticket notification to admin / support email
    try {
      const adminEmailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #111; line-height: 1.6;">
          <h2 style="color: #e11d48;">New Support Request received on CodeRival</h2>
          <p><strong>Sender Name:</strong> ${name}</p>
          <p><strong>Sender Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="white-space: pre-wrap; background: #f4f4f5; padding: 15px; rounded: 8px;">${message}</p>
        </div>
      `;
      await emailService.sendEmail(adminSupportEmail, adminEmailHtml, `[CodeRival Support] ${subject}`);
    } catch (e) {
      console.warn("Support notification email dispatch error:", e);
    }

    // 2. Send confirmation receipt email to the user
    try {
      const userConfirmationHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #111; line-height: 1.6;">
          <h2>We received your message, ${name}!</h2>
          <p>Thank you for reaching out to CodeRival Support. Our team has received your message and will review it shortly.</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p><strong>Subject:</strong> ${subject}</p>
          <p style="white-space: pre-wrap; background: #f4f4f5; padding: 15px; rounded: 8px;">${message}</p>
        </div>
      `;
      await emailService.sendEmail(email, userConfirmationHtml, `CodeRival Support Request Received: ${subject}`);
    } catch (e) {
      console.warn("User confirmation email dispatch error:", e);
    }

    return res.status(200).json({
      success: true,
      message: "Your message has been sent successfully! We will get back to you shortly.",
    });
  } catch (error) {
    console.error("sendContactForm error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
