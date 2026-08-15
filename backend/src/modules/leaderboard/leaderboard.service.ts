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
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { appearOnLeaderboard: true },
    });

    if (user && !user.appearOnLeaderboard) {
      await redis.zrem(GLOBAL_LEADERBOARD_KEY, userId);
      return;
    }

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
    await redis.del(GLOBAL_LEADERBOARD_KEY);

    const users = await db.user.findMany({
      where: { appearOnLeaderboard: true },
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
export const getGlobalLeaderboard = async (currentUserId?: string, page: number = 1, limit: number = 20) => {
  try {
    // 1. Fetch total count of active leaderboard participants
    const totalPlayersCount = await db.user.count({
      where: { appearOnLeaderboard: true },
    });

    const skip = (page - 1) * limit;

    // 2. Fetch users ordered by rating desc, then createdAt asc
    const users = await db.user.findMany({
      where: { appearOnLeaderboard: true },
      orderBy: [
        { rating: "desc" },
        { createdAt: "asc" },
      ],
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
        appearOnLeaderboard: true,
      },
      skip,
      take: limit,
    });

    const leaderboard = await Promise.all(
      users.map(async (u, index) => {
        const actualSolved = await calculateUserProblemsSolved(u.id);
        if (u.problemsSolved !== actualSolved) {
          await db.user.update({ where: { id: u.id }, data: { problemsSolved: actualSolved } });
          u.problemsSolved = actualSolved;
        }
        return {
          rank: skip + index + 1,
          ...u,
          isOnline: isUserConnected(u.id),
        };
      })
    );

    // 3. Compute current user's exact global rank
    let currentUserRankInfo = null;
    if (currentUserId) {
      const currentUser = await db.user.findUnique({
        where: { id: currentUserId },
        select: { appearOnLeaderboard: true, rating: true, createdAt: true },
      });

      if (currentUser?.appearOnLeaderboard) {
        const higherCount = await db.user.count({
          where: {
            appearOnLeaderboard: true,
            OR: [
              { rating: { gt: currentUser.rating } },
              {
                rating: currentUser.rating,
                createdAt: { lt: currentUser.createdAt },
              },
            ],
          },
        });

        currentUserRankInfo = {
          rank: higherCount + 1,
          rating: currentUser.rating,
        };
      }
    }

    // Background sync to ensure Redis ZSET is updated cleanly
    syncGlobalLeaderboard().catch((e) => console.error("Background sync error:", e));

    return {
      leaderboard,
      currentUserRank: currentUserRankInfo,
      totalPlayers: totalPlayersCount,
      hasMore: skip + users.length < totalPlayersCount,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error getting global leaderboard:", error);
    throw error;
  }
};

/**
 * Fetches Friends Leaderboard using Redis ratings + PostgreSQL Friendships
 */
export const getFriendsLeaderboard = async (currentUserId: string, page: number = 1, limit: number = 20) => {
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
    const fullLeaderboard = users
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

    const currentUserRankItem = fullLeaderboard.find((u) => u.isCurrentUser);

    const start = (page - 1) * limit;
    const pagedLeaderboard = fullLeaderboard.slice(start, start + limit);

    return {
      leaderboard: pagedLeaderboard,
      currentUserRank: currentUserRankItem ? currentUserRankItem.rank : null,
      totalFriends: fullLeaderboard.length - 1,
      hasMore: start + pagedLeaderboard.length < fullLeaderboard.length,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error getting friends leaderboard:", error);
    throw error;
  }
};
