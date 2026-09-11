import { Server } from "socket.io";
import { QueuePlayer, MatchmakingResult } from "./matchmaking.types";
import {
  addPlayerToQueue,
  getOpponentFromQueue,
  isPlayerInQueue,
  removePlayerFromQueue,
  getWaitingPlayers,
  getWaitingQueueCount,
} from "./matchmaking.queue";
import { getUserActiveMatch } from "../../socket/socketManager";
import { startMatch } from "../match/match.service";

export const notifyQueueUpdate = async (io: Server): Promise<void> => {
  try {
    const rawPlayers = await getWaitingPlayers();
    io.emit("matchmaking:queue_update", {
      count: rawPlayers.length,
      players: rawPlayers.map((p) => ({
        userId: p.userId,
        username: p.username || `coder_${p.userId.slice(-4)}`,
        name: p.name || p.username || "Coder",
        rating: p.rating,
        avatar_url: p.avatar_url || null,
        avatar_id: p.avatar_id || null,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (err) {
    console.error("Queue notification error:", err);
  }
};

export const joinQueue = async (player: QueuePlayer): Promise<MatchmakingResult> => {
  // 1. Prevent duplicate queue entries
  const alreadyInQueue = await isPlayerInQueue(player.userId);
  if (alreadyInQueue) {
    return {
      success: false,
      message: "Player is already in matchmaking queue.",
    };
  }

  // 2. Prevent queueing if user is in an active match
  const activeMatchId = getUserActiveMatch(player.userId);
  if (activeMatchId) {
    return {
      success: false,
      message: "Player is already in an active match.",
    };
  }

  // 3. Try to find an opponent immediately
  const waitingPlayers = await getWaitingPlayers();
  const opponent = await getOpponentFromQueue(player, waitingPlayers);

  if (!opponent) {
    await addPlayerToQueue(player);
    return {
      success: true,
      matched: false,
    };
  }

  // Opponent found: remove opponent from queue and match them
  await removePlayerFromQueue(opponent.userId);

  return {
    success: true,
    matched: true,
    opponent,
  };
};

export const leaveQueue = async (userId: string): Promise<void> => {
  await removePlayerFromQueue(userId);
};

let tickerInterval: NodeJS.Timeout | null = null;

export const processQueueMatches = async (io: Server): Promise<void> => {
  try {
    // Quick O(1) check: if fewer than 2 players in queue, do not fetch hashes
    const queueCount = await getWaitingQueueCount();
    if (queueCount < 2) return;

    const waitingPlayers = await getWaitingPlayers();
    if (waitingPlayers.length < 2) return;

    const matchedUserIds = new Set<string>();

    for (let i = 0; i < waitingPlayers.length; i++) {
      const player1 = waitingPlayers[i];
      if (matchedUserIds.has(player1.userId)) continue;

      if (getUserActiveMatch(player1.userId)) {
        await removePlayerFromQueue(player1.userId);
        continue;
      }

      // Use the in-memory array — NO extra Redis queries in this loop!
      const opponent = await getOpponentFromQueue(player1, waitingPlayers);
      if (opponent && !matchedUserIds.has(opponent.userId)) {
        if (getUserActiveMatch(opponent.userId)) {
          await removePlayerFromQueue(opponent.userId);
          continue;
        }

        matchedUserIds.add(player1.userId);
        matchedUserIds.add(opponent.userId);

        await removePlayerFromQueue(player1.userId);
        await removePlayerFromQueue(opponent.userId);

        try {
          await startMatch(io, player1, opponent);
        } catch (err) {
          console.error(`Failed to start match between ${player1.userId} and ${opponent.userId}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("Error in matchmaking ticker loop:", error);
  }
};

export const initMatchmakingTicker = (io: Server): void => {
  if (tickerInterval) return;

  tickerInterval = setInterval(() => {
    processQueueMatches(io);
  }, 2000);
};