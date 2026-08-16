import { Server, Socket } from "socket.io";
import { db } from "../../config/db";
import { Difficulty, MatchFinishReason, MatchResult, MatchStatus, Verdict } from "../../generated/prisma/client";
import {
  getSocket,
  setUserActiveMatch,
  getUserActiveMatch,
  clearUserActiveMatch,
  setDisconnectTimer,
  clearDisconnectTimer,
  isUserConnected,
} from "../../socket/socketManager";
import { QueuePlayer } from "../matchmaking/matchmaking.types";
import { updateUserRatingInLeaderboard } from "../leaderboard/leaderboard.service";
import { handleTournamentMatchFinished } from "../tournament/tournament.service";
import { createNotification } from "../notification/notification.service";
import { invalidateCache } from "../../utils/cache";

const checkAndNotifyTierUpgrade = async (userId: string, oldRating: number, newRating: number) => {
  const TIER_THRESHOLDS = [
    { min: 2200, name: "Grandmaster" },
    { min: 1900, name: "Master" },
    { min: 1600, name: "Candidate Master" },
    { min: 1400, name: "Specialist" },
    { min: 1200, name: "Apprentice" },
  ];

  for (const tier of TIER_THRESHOLDS) {
    if (oldRating < tier.min && newRating >= tier.min) {
      await createNotification({
        userId,
        type: "RATING_TIER_UPGRADE",
        title: "Rank Tier Upgrade!",
        message: `🎉 Rank Up! You have reached ${tier.name} (${tier.min}+ ELO).`,
      });
      break;
    }
  }
};

const activeMatchTimers = new Map<string, NodeJS.Timeout>();
const startingMatchUsers = new Set<string>();
const endingMatches = new Set<string>();

export const calculateElo = (
  r1: number,
  r2: number,
  score1: number
): { newR1: number; newR2: number; delta1: number; delta2: number } => {
  const K = 32;
  const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
  const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400));
  const score2 = 1 - score1;

  const delta1 = Math.round(K * (score1 - e1));
  const delta2 = Math.round(K * (score2 - e2));

  const newR1 = Math.max(100, r1 + delta1);
  const newR2 = Math.max(100, r2 + delta2);

  return { newR1, newR2, delta1, delta2 };
};

export const createMatch = async (
  player1: QueuePlayer,
  player2: QueuePlayer
) => {
  const avgRating = (player1.rating + player2.rating) / 2;

  let targetDifficulty: Difficulty = Difficulty.EASY;
  if (avgRating >= 1700) {
    targetDifficulty = Difficulty.HARD;
  } else if (avgRating >= 1300) {
    targetDifficulty = Difficulty.MEDIUM;
  }

  // Fetch problems of target difficulty
  let problems = await db.problem.findMany({
    where: { difficulty: targetDifficulty },
    select: { id: true },
  });

  // Fallback to any problem if no problems found for target difficulty
  if (problems.length === 0) {
    problems = await db.problem.findMany({ select: { id: true } });
  }

  if (problems.length === 0) {
    throw new Error("No problem available in the database.");
  }

  const randomIndex = Math.floor(Math.random() * problems.length);
  const selectedProblemId = problems[randomIndex].id;

  const match = await db.match.create({
    data: {
      player1Id: player1.userId,
      player2Id: player2.userId,
      problemId: selectedProblemId,
      status: MatchStatus.ACTIVE,
      startedAt: new Date(),
    },
    include: {
      problem: {
        include: {
          examples: { orderBy: { order: "asc" } },
          topics: true,
          signature: true,
          starterCodes: true,
        },
      },
      player1: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true },
      },
      player2: {
        select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true },
      },
    },
  });

  return match;
};

export const startMatch = async (
  io: Server,
  player1: QueuePlayer,
  player2: QueuePlayer
) => {
  if (startingMatchUsers.has(player1.userId) || startingMatchUsers.has(player2.userId)) {
    console.warn(`[startMatch] User ${player1.userId} or ${player2.userId} match creation in progress. Skipping.`);
    return null;
  }

  const activeP1 = getUserActiveMatch(player1.userId);
  const activeP2 = getUserActiveMatch(player2.userId);
  if (activeP1 || activeP2) {
    const existingMatchId = activeP1 || activeP2;
    console.warn(`[startMatch] User already in active match (${existingMatchId}). Skipping creation.`);
    return await db.match.findUnique({
      where: { id: existingMatchId! },
      include: {
        problem: true,
        player1: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
        player2: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
      },
    });
  }

  const existingDbMatch = await db.match.findFirst({
    where: {
      OR: [
        { player1Id: player1.userId, status: MatchStatus.ACTIVE },
        { player2Id: player1.userId, status: MatchStatus.ACTIVE },
        { player1Id: player2.userId, status: MatchStatus.ACTIVE },
        { player2Id: player2.userId, status: MatchStatus.ACTIVE },
      ],
    },
  });

  if (existingDbMatch) {
    setUserActiveMatch(player1.userId, existingDbMatch.id);
    setUserActiveMatch(player2.userId, existingDbMatch.id);
    return existingDbMatch;
  }

  startingMatchUsers.add(player1.userId);
  startingMatchUsers.add(player2.userId);

  try {
    // 1. Create match in DB
    const match = await createMatch(player1, player2);

    // 2. Fetch sockets
    const player1Socket = getSocket(player1.userId);
    const player2Socket = getSocket(player2.userId);

    const roomId = `match:${match.id}`;

    // Make all connected sockets for both players join the match room
    io.in(`user:${player1.userId}`).socketsJoin(roomId);
    io.in(`user:${player2.userId}`).socketsJoin(roomId);

    if (player1Socket) {
      player1Socket.join(roomId);
    }
    if (player2Socket) {
      player2Socket.join(roomId);
    }

    // 3. Mark players active in match
    setUserActiveMatch(player1.userId, match.id);
    setUserActiveMatch(player2.userId, match.id);

    // 4. Set match duration timeout (15 minutes)
    const matchDurationMs = 15 * 60 * 1000;
    const matchTimeoutTimer = setTimeout(async () => {
      await handleMatchTimeout(io, match.id);
    }, matchDurationMs);

    activeMatchTimers.set(match.id, matchTimeoutTimer);

    const startPayload = {
      matchId: match.id,
      roomId,
      startedAt: match.startedAt ? match.startedAt.getTime() : Date.now(),
      durationMs: matchDurationMs,
      problem: match.problem,
      player1: match.player1,
      player2: match.player2,
    };

    // 5. Notify both clients directly via user rooms, direct sockets, and match room
    io.to(`user:${player1.userId}`).emit("match:start", startPayload);
    io.to(`user:${player1.userId}`).emit("match:found", startPayload);
    io.to(`user:${player2.userId}`).emit("match:start", startPayload);
    io.to(`user:${player2.userId}`).emit("match:found", startPayload);

    if (player1Socket) {
      player1Socket.emit("match:start", startPayload);
      player1Socket.emit("match:found", startPayload);
    }
    if (player2Socket) {
      player2Socket.emit("match:start", startPayload);
      player2Socket.emit("match:found", startPayload);
    }

    io.to(roomId).emit("match:start", startPayload);
    io.to(roomId).emit("match:found", startPayload);

    return match;
  } finally {
    startingMatchUsers.delete(player1.userId);
    startingMatchUsers.delete(player2.userId);
  }
};

export const endMatch = async (
  io: Server,
  matchId: string,
  winnerId: string | null,
  result: MatchResult,
  reason?: MatchFinishReason | null
) => {
  // Guard against concurrent endMatch calls for the same matchId in memory
  if (endingMatches.has(matchId)) {
    return null;
  }
  endingMatches.add(matchId);

  try {
    // Clear match timer
    const matchTimeoutTimer = activeMatchTimers.get(matchId);
    if (matchTimeoutTimer) {
      clearTimeout(matchTimeoutTimer);
      activeMatchTimers.delete(matchId);
    }

    // Idempotency check: verify match status in DB
    const currentMatch = await db.match.findUnique({
      where: { id: matchId },
      include: { player1: true, player2: true },
    });

    if (
      !currentMatch ||
      currentMatch.status === MatchStatus.FINISHED ||
      currentMatch.status === MatchStatus.CANCELLED
    ) {
      return null;
    }

    const p1 = currentMatch.player1;
    const p2 = currentMatch.player2;

    let score1 = 0.5;
    if (result === MatchResult.PLAYER1) {
      score1 = 1;
    } else if (result === MatchResult.PLAYER2) {
      score1 = 0;
    } else if (result === MatchResult.ABANDONED) {
      score1 = winnerId === p1.id ? 1 : 0;
    }

    const { newR1, newR2, delta1, delta2 } = calculateElo(p1.rating, p2.rating, score1);

    let matchResult: MatchResult = result;
    if (!matchResult) {
      if (winnerId === p1.id) matchResult = MatchResult.PLAYER1;
      else if (winnerId === p2.id) matchResult = MatchResult.PLAYER2;
      else matchResult = MatchResult.DRAW;
    }

    const isP1Winner = winnerId === p1.id || matchResult === MatchResult.PLAYER1;
    const isP2Winner = winnerId === p2.id || matchResult === MatchResult.PLAYER2;
    const isDraw = matchResult === MatchResult.DRAW;

    // Perform atomic status transition from ACTIVE to FINISHED in DB first
    const statusUpdateResult = await db.match.updateMany({
      where: {
        id: matchId,
        status: MatchStatus.ACTIVE,
      },
      data: {
        status: MatchStatus.FINISHED,
        winnerId: winnerId || null,
        result: matchResult,
        reason: reason || null,
        endedAt: new Date(),
      },
    });

    // If count is 0, another execution already marked this match FINISHED
    if (statusUpdateResult.count === 0) {
      return null;
    }

    await db.$transaction([
      db.user.update({
        where: { id: p1.id },
        data: {
          rating: newR1,
          wins: isP1Winner ? { increment: 1 } : undefined,
          losses: isP2Winner ? { increment: 1 } : undefined,
          draws: isDraw ? { increment: 1 } : undefined,
          matchesPlayed: { increment: 1 },
        },
      }),
      db.user.update({
        where: { id: p2.id },
        data: {
          rating: newR2,
          wins: isP2Winner ? { increment: 1 } : undefined,
          losses: isP1Winner ? { increment: 1 } : undefined,
          draws: isDraw ? { increment: 1 } : undefined,
          matchesPlayed: { increment: 1 },
        },
      }),
      db.ratingHistory.create({
        data: {
          userId: p1.id,
          matchId: matchId,
          rating: newR1,
          delta: delta1,
        },
      }),
      db.ratingHistory.create({
        data: {
          userId: p2.id,
          matchId: matchId,
          rating: newR2,
          delta: delta2,
        },
      }),
    ]);

  // Update Redis Leaderboards
  updateUserRatingInLeaderboard(p1.id, newR1);
  updateUserRatingInLeaderboard(p2.id, newR2);

  // Check for ELO Tier Upgrades
  checkAndNotifyTierUpgrade(p1.id, p1.rating, newR1).catch((e) => console.error("Tier notification error p1:", e));
  checkAndNotifyTierUpgrade(p2.id, p2.rating, newR2).catch((e) => console.error("Tier notification error p2:", e));

  clearUserActiveMatch(p1.id);
  clearUserActiveMatch(p2.id);

  const tournamentMatch = await db.tournamentMatch.findFirst({ where: { matchId } });

  const endPayload = {
    matchId,
    winnerId,
    result: matchResult,
    reason: reason || null,
    tournamentId: tournamentMatch?.tournamentId || null,
    player1: {
      id: p1.id,
      username: p1.username,
      oldRating: p1.rating,
      newRating: newR1,
      delta: delta1,
    },
    player2: {
      id: p2.id,
      username: p2.username,
      oldRating: p2.rating,
      newRating: newR2,
      delta: delta2,
    },
  };

  const p1Socket = getSocket(p1.id);
  const p2Socket = getSocket(p2.id);

  if (p1Socket) p1Socket.emit("match:ended", endPayload);
  if (p2Socket) p2Socket.emit("match:ended", endPayload);

  io.to(`match:${matchId}`).emit("match:ended", endPayload);

  // Trigger tournament bracket advancement if this match is part of a tournament
  if (winnerId) {
    handleTournamentMatchFinished(io, matchId, winnerId).catch((err) => {
      console.error("Tournament match finish handler error:", err);
    });
  }

    const updatedMatch = await db.match.findUnique({ where: { id: matchId } });

    // Invalidate cached leaderboards and match history for both players
    invalidateCache(
      "cache:leaderboard:*",
      `cache:matches:${p1.id}:*`,
      `cache:matches:${p2.id}:*`,
      `cache:profile:${p1.id}:*`,
      `cache:profile:${p2.id}:*`
    ).catch((err) => console.error("Match end cache invalidation error:", err));

    return updatedMatch;
  } finally {
    endingMatches.delete(matchId);
  }
};

export const handleMatchSubmission = async (
  io: Server,
  matchId: string,
  userId: string,
  submissionResult: any
) => {
  const roomId = `match:${matchId}`;

  // Broadcast submission result to room
  io.to(roomId).emit("match:submission_result", {
    userId,
    verdict: submissionResult.verdict,
    passedTestCases: submissionResult.passedTestCases,
    totalTestCases: submissionResult.totalTestCases,
    runtimeMs: submissionResult.runtimeMs,
  });

  // If verdict is AC, end match and declare winner
  if (submissionResult.verdict === Verdict.AC) {
    const match = await db.match.findUnique({ where: { id: matchId } });
    if (match && match.status === MatchStatus.ACTIVE) {
      const matchResult = match.player1Id === userId ? MatchResult.PLAYER1 : MatchResult.PLAYER2;
      await endMatch(io, matchId, userId, matchResult, MatchFinishReason.SOLUTION_ACCEPTED);
    }
  }
};

export const handleMatchTimeout = async (io: Server, matchId: string) => {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      submissions: {
        where: { verdict: { not: null } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!match || match.status !== MatchStatus.ACTIVE) {
    return;
  }

  const p1Submissions = match.submissions.filter((s) => s.userId === match.player1Id);
  const p2Submissions = match.submissions.filter((s) => s.userId === match.player2Id);

  const p1BestPasses = p1Submissions.reduce((max, s) => Math.max(max, s.passedTestCases), 0);
  const p2BestPasses = p2Submissions.reduce((max, s) => Math.max(max, s.passedTestCases), 0);

  let winnerId: string | null = null;
  let result: MatchResult = MatchResult.DRAW;

  if (p1BestPasses > p2BestPasses) {
    winnerId = match.player1Id;
    result = MatchResult.PLAYER1;
  } else if (p2BestPasses > p1BestPasses) {
    winnerId = match.player2Id;
    result = MatchResult.PLAYER2;
  } else {
    result = MatchResult.DRAW;
  }

  const timeoutReason = winnerId ? MatchFinishReason.TIMEOUT : MatchFinishReason.DRAW;
  await endMatch(io, matchId, winnerId, result, timeoutReason);
};

export const handlePlayerMatchDisconnect = async (io: Server, userId: string) => {
  const matchId = getUserActiveMatch(userId);
  if (!matchId) return;

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== MatchStatus.ACTIVE) return;

  const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
  const opponentSocket = getSocket(opponentId);

  if (opponentSocket) {
    opponentSocket.emit("match:opponent_status", {
      status: "DISCONNECTED",
      gracePeriodMs: 30000,
    });
  }

  const timer = setTimeout(async () => {
    clearDisconnectTimer(userId);
    if (!isUserConnected(userId)) {
      await endMatch(io, matchId, opponentId, MatchResult.ABANDONED, MatchFinishReason.OPPONENT_DISCONNECTED);
    }
  }, 30000);

  setDisconnectTimer(userId, timer);
};

export const handlePlayerMatchReconnect = async (socket: Socket, io: Server, matchId: string) => {
  const userId = socket.data.user.id;

  clearDisconnectTimer(userId);

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      problem: {
        include: {
          examples: { orderBy: { order: "asc" } },
          topics: true,
          signature: true,
          starterCodes: true,
        },
      },
      player1: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
      player2: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
      tournamentMatches: true,
    },
  });

  if (!match || match.status !== MatchStatus.ACTIVE) {
    socket.emit("match:error", { message: "Match is not active or has already ended." });
    return;
  }

  if (match.startedAt && Date.now() - match.startedAt.getTime() >= 15 * 60 * 1000) {
    await handleMatchTimeout(io, matchId);
    return;
  }

  const isParticipant = match.player1Id === userId || match.player2Id === userId;
  const isTournamentMatch = match.tournamentMatches && match.tournamentMatches.length > 0;

  if (!isParticipant && !isTournamentMatch) {
    socket.emit("match:error", { message: "Access denied: You are not a participant in this 1v1 battle." });
    return;
  }

  const roomId = `match:${match.id}`;
  socket.join(roomId);

  if (isParticipant) {
    setUserActiveMatch(userId, match.id);
    socket.to(roomId).emit("match:opponent_status", {
      status: "CONNECTED",
    });
  }

  socket.emit("match:sync_state", {
    matchId: match.id,
    roomId,
    startedAt: match.startedAt ? match.startedAt.getTime() : Date.now(),
    problem: match.problem,
    player1: match.player1,
    player2: match.player2,
    tournamentMatches: match.tournamentMatches,
  });
};

export const getMatch = async (matchId: string, io?: Server) => {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      player1: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
      player2: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
      problem: true,
      tournamentMatches: true,
      submissions: {
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (match && match.status === MatchStatus.ACTIVE && match.startedAt) {
    const elapsed = Date.now() - match.startedAt.getTime();
    if (elapsed >= 15 * 60 * 1000) {
      if (io) {
        await handleMatchTimeout(io, matchId);
      }
      return await db.match.findUnique({
        where: { id: matchId },
        include: {
          player1: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
          player2: { select: { id: true, username: true, name: true, avatar_url: true, avatar_id: true, rating: true } },
          problem: true,
          tournamentMatches: true,
          submissions: {
            orderBy: { submittedAt: "desc" },
          },
        },
      });
    }
  }

  return match;
};

export const checkExpiredMatches = async (io: Server) => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredMatches = await db.match.findMany({
      where: {
        status: MatchStatus.ACTIVE,
        startedAt: { lte: fifteenMinsAgo },
      },
      select: { id: true },
    });

    for (const m of expiredMatches) {
      await handleMatchTimeout(io, m.id);
    }
  } catch (error) {
    console.error("Error checking expired matches:", error);
  }
};