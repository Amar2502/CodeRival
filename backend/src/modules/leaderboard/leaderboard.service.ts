import { redis } from "../../config/redis";
import { db } from "../../config/db";
import { isUserConnected } from "../../socket/socketManager";
import { calculateUserProblemsSolved } from "../user/user.controller";

const GLOBAL_LEADERBOARD_KEY = "leaderboard:global";

/**
 * Updates a user's ELO rating in the Redis Sorted Set
 */
export const updateUserRatingInLeaderboard = async (userId: string, rating: number) => {
  try {
    await redis.zadd(GLOBAL_LEADERBOARD_KEY, rating, userId);
  } catch (error) {
    console.error(`Failed to update Redis leaderboard for user ${userId}:`, error);
  }
};

/**
 * Syncs all users from PostgreSQL into Redis Sorted Set
 */
export const syncGlobalLeaderboard = async () => {
  try {
    const users = await db.user.findMany({
      select: { id: true, rating: true },
    });

    if (users.length === 0) return;

    const pipeline = redis.pipeline();
    users.forEach((user) => {
      pipeline.zadd(GLOBAL_LEADERBOARD_KEY, user.rating, user.id);
    });

    await pipeline.exec();
    console.log(`Synced ${users.length} users into Redis Global Leaderboard.`);
  } catch (error) {
    console.error("Failed to sync global leaderboard to Redis:", error);
  }
};

/**
 * Fetches the Global Leaderboard from Redis ZSET
 */
export const getGlobalLeaderboard = async (currentUserId?: string, limit: number = 50) => {
  try {
    let card = await redis.zcard(GLOBAL_LEADERBOARD_KEY);

    // Auto-sync if Redis leaderboard set is empty
    if (card === 0) {
      await syncGlobalLeaderboard();
      card = await redis.zcard(GLOBAL_LEADERBOARD_KEY);
    }

    // Fetch top user IDs with scores in descending order (highest rating first)
    const rawList = await redis.zrevrange(GLOBAL_LEADERBOARD_KEY, 0, limit - 1, "WITHSCORES");

    const userIds: string[] = [];
    const ratingMap = new Map<string, number>();

    for (let i = 0; i < rawList.length; i += 2) {
      const uId = rawList[i];
      const score = parseInt(rawList[i + 1], 10);
      userIds.push(uId);
      ratingMap.set(uId, score);
    }

    if (userIds.length === 0) {
      return { leaderboard: [], currentUserRank: null };
    }

    // Fetch rich user profiles from DB preserving rank order
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
        avatar_url: true,
        avatar_id: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        problemsSolved: true,
      },
    });

    const userMap = new Map(
      await Promise.all(
        users.map(async (u) => {
          const actualSolved = await calculateUserProblemsSolved(u.id);
          if (u.problemsSolved !== actualSolved) {
            await db.user.update({ where: { id: u.id }, data: { problemsSolved: actualSolved } });
            u.problemsSolved = actualSolved;
          }
          return [u.id, u] as const;
        })
      )
    );

    const leaderboard = userIds
      .map((id, index) => {
        const u = userMap.get(id);
        if (!u) return null;
        return {
          rank: index + 1,
          ...u,
          rating: ratingMap.get(id) ?? u.rating,
          isOnline: isUserConnected(id),
        };
      })
      .filter(Boolean);

    // Compute current user's global rank & rating
    let currentUserRankInfo = null;
    if (currentUserId) {
      const revRank = await redis.zrevrank(GLOBAL_LEADERBOARD_KEY, currentUserId);
      const score = await redis.zscore(GLOBAL_LEADERBOARD_KEY, currentUserId);

      if (revRank !== null && score !== null) {
        currentUserRankInfo = {
          rank: revRank + 1,
          rating: parseInt(score, 10),
        };
      }
    }

    return {
      leaderboard,
      currentUserRank: currentUserRankInfo,
      totalPlayers: card,
    };
  } catch (error) {
    console.error("Error getting global leaderboard:", error);
    throw error;
  }
};

/**
 * Fetches Friends Leaderboard using Redis ratings + PostgreSQL Friendships
 */
export const getFriendsLeaderboard = async (currentUserId: string) => {
  try {
    // 1. Fetch user's accepted friendships
    const friendships = await db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      },
      select: { senderId: true, receiverId: true },
    });

    // 2. Collect unique friend IDs + current user ID
    const friendIdSet = new Set<string>([currentUserId]);
    friendships.forEach((f) => {
      friendIdSet.add(f.senderId === currentUserId ? f.receiverId : f.senderId);
    });

    const targetUserIds = Array.from(friendIdSet);

    // 3. Fetch ratings from Redis using pipeline
    const pipeline = redis.pipeline();
    targetUserIds.forEach((id) => pipeline.zscore(GLOBAL_LEADERBOARD_KEY, id));
    const scores = await pipeline.exec();

    const redisRatingMap = new Map<string, number>();
    scores?.forEach(([err, res], idx) => {
      if (!err && res !== null) {
        redisRatingMap.set(targetUserIds[idx], parseInt(res as string, 10));
      }
    });

    // 4. Fetch rich profiles from DB
    const rawUsers = await db.user.findMany({
      where: { id: { in: targetUserIds } },
      select: {
        id: true,
        username: true,
        name: true,
        avatar_url: true,
        avatar_id: true,
        country: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        problemsSolved: true,
      },
    });

    const users = await Promise.all(
      rawUsers.map(async (u) => {
        const actualSolved = await calculateUserProblemsSolved(u.id);
        if (u.problemsSolved !== actualSolved) {
          await db.user.update({ where: { id: u.id }, data: { problemsSolved: actualSolved } });
          u.problemsSolved = actualSolved;
        }
        return u;
      })
    );

    // 5. Merge Redis rating and sort descending
    const leaderboard = users
      .map((u) => ({
        ...u,
        rating: redisRatingMap.get(u.id) ?? u.rating,
        isOnline: isUserConnected(u.id),
        isCurrentUser: u.id === currentUserId,
      }))
      .sort((a, b) => b.rating - a.rating)
      .map((user, index) => ({
        rank: index + 1,
        ...user,
      }));

    const currentUserRankItem = leaderboard.find((u) => u.isCurrentUser);

    return {
      leaderboard,
      currentUserRank: currentUserRankItem ? currentUserRankItem.rank : null,
      totalFriends: leaderboard.length - 1,
    };
  } catch (error) {
    console.error("Error getting friends leaderboard:", error);
    throw error;
  }
};
