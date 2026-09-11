import { redis } from "../../config/redis";
import { QueuePlayer } from "./matchmaking.types";

const WAITING_QUEUE = "matchmaking:waiting";
const PLAYER_KEY = (userId: string) => `matchmaking:player:${userId}`;

const MATCHMAKING_RANGES = [
  { wait: 5, diff: 100 },
  { wait: 10, diff: 150 },
  { wait: 20, diff: 200 },
  { wait: 30, diff: 300 },
  { wait: 45, diff: 500 },
];

export const getAllowedDifference = (waitingTimeMs: number): number => {
  const seconds = waitingTimeMs / 1000;

  for (const range of MATCHMAKING_RANGES) {
    if (seconds < range.wait) {
      return range.diff;
    }
  }

  return Infinity;
};

export const addPlayerToQueue = async (
  player: QueuePlayer
): Promise<void> => {
  const pipeline = redis.pipeline();

  pipeline.hset(PLAYER_KEY(player.userId), {
    userId: player.userId,
    username: player.username || "",
    name: player.name || "",
    avatar_url: player.avatar_url || "",
    avatar_id: player.avatar_id || "",
    avatar: player.avatar_url || player.avatar || "",
    socketId: player.socketId,
    rating: player.rating.toString(),
    joinedAt: player.joinedAt.toString(),
  });

  pipeline.zadd(
    WAITING_QUEUE,
    player.joinedAt,
    player.userId
  );

  await pipeline.exec();
};

export const removePlayerFromQueue = async (
  userId: string
): Promise<void> => {
  const pipeline = redis.pipeline();
  pipeline.del(PLAYER_KEY(userId));
  pipeline.zrem(WAITING_QUEUE, userId);
  await pipeline.exec();
};

export const isPlayerInQueue = async (
  userId: string
): Promise<boolean> => {
  return (await redis.exists(PLAYER_KEY(userId))) === 1;
};

export const getPlayerFromQueue = async (
  userId: string
): Promise<QueuePlayer | null> => {
  const player = await redis.hgetall(PLAYER_KEY(userId));

  if (!player || Object.keys(player).length === 0) {
    return null;
  }

  return {
    userId: player.userId,
    username: player.username || undefined,
    name: player.name || null,
    avatar_url: player.avatar_url || null,
    avatar_id: player.avatar_id || null,
    avatar: player.avatar_url || player.avatar || "",
    socketId: player.socketId,
    rating: Number(player.rating),
    joinedAt: Number(player.joinedAt),
  };
};

export const getWaitingPlayers = async (): Promise<QueuePlayer[]> => {
  const userIds = await redis.zrange(WAITING_QUEUE, 0, -1);

  if (userIds.length === 0) {
    return [];
  }

  const pipeline = redis.pipeline();

  userIds.forEach((id) => {
    pipeline.hgetall(PLAYER_KEY(id));
  });

  const results = await pipeline.exec();

  const players: QueuePlayer[] = [];

  if (!results) return players;

  for (const [err, data] of results) {
    if (err) continue;

    const player = data as Record<string, string>;

    if (!player || !player.userId) continue;

    players.push({
      userId: player.userId,
      username: player.username || undefined,
      name: player.name || null,
      avatar_url: player.avatar_url || null,
      avatar_id: player.avatar_id || null,
      avatar: player.avatar_url || player.avatar || "",
      socketId: player.socketId,
      rating: Number(player.rating),
      joinedAt: Number(player.joinedAt),
    });
  }

  return players;
};

export const getWaitingQueueCount = async (): Promise<number> => {
  return await redis.zcard(WAITING_QUEUE);
};

export const getOpponentFromQueue = async (
  player: QueuePlayer,
  waitingPlayersInput?: QueuePlayer[]
): Promise<QueuePlayer | null> => {
  const waitingPlayers = waitingPlayersInput || (await getWaitingPlayers());
  const now = Date.now();

  for (const opponent of waitingPlayers) {
    if (opponent.userId === player.userId) continue;

    const playerWait = now - player.joinedAt;
    const opponentWait = now - opponent.joinedAt;

    const allowedDifference = Math.max(
      getAllowedDifference(playerWait),
      getAllowedDifference(opponentWait)
    );

    if (Math.abs(player.rating - opponent.rating) <= allowedDifference) {
      return opponent;
    }
  }

  return null;
};