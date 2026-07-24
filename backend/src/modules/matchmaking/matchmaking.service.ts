import { Server } from "socket.io";
import { QueuePlayer, MatchmakingResult } from "./matchmaking.types";
import {
  addPlayerToQueue,
  getOpponentFromQueue,
  isPlayerInQueue,
  removePlayerFromQueue,
  getWaitingPlayers,
} from "./matchmaking.queue";
import { getUserActiveMatch } from "../../socket/socketManager";
import { startMatch } from "../match/match.service";

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
  const opponent = await getOpponentFromQueue(player);

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
    const waitingPlayers = await getWaitingPlayers();
    if (waitingPlayers.length < 2) return;

    const matchedUserIds = new Set<string>();

    for (let i = 0; i < waitingPlayers.length; i++) {
      const player1 = waitingPlayers[i];
      if (matchedUserIds.has(player1.userId)) continue;

      const opponent = await getOpponentFromQueue(player1);
      if (opponent && !matchedUserIds.has(opponent.userId)) {
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