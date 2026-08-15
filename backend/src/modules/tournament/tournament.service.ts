import { Server } from "socket.io";
import { db } from "../../config/db";
import { TournamentStatus, TournamentMatchRound, MatchStatus } from "../../generated/prisma/client";
import { createMatch } from "../match/match.service";

export const createTournamentService = async (
  creatorId: string,
  title?: string,
  maxPlayersInput: number = 8
) => {
  const maxPlayers = maxPlayersInput === 4 ? 4 : 8;
  const requiredFriends = maxPlayers - 1; // 3 for 4-player, 7 for 8-player

  // Check if creator has enough friends
  const friendCount = await db.friendship.count({
    where: {
      OR: [
        { senderId: creatorId, status: "ACCEPTED" },
        { receiverId: creatorId, status: "ACCEPTED" },
      ],
    },
  });

  if (friendCount < requiredFriends) {
    throw new Error(
      `You need at least ${requiredFriends} friends to create a ${maxPlayers}-player tournament. You currently have ${friendCount} friend(s). Please add more friends first!`
    );
  }

  // 1. Create Tournament record
  const tournament = await db.tournament.create({
    data: {
      title: title || `${maxPlayers}-Player Championship`,
      maxPlayers,
      creatorId,
      status: TournamentStatus.WAITING_FOR_PLAYERS,
    },
  });

  // 2. Creator automatically joins as Seed #1
  await db.tournamentParticipant.create({
    data: {
      tournamentId: tournament.id,
      userId: creatorId,
      seed: 1,
    },
  });

  // 3. Pre-create the bracket nodes for Single Elimination
  // Create Finals node first so SF can point to it
  const finalMatch = await db.tournamentMatch.create({
    data: {
      tournamentId: tournament.id,
      round: TournamentMatchRound.FINALS,
      matchIndex: 0,
    },
  });

  if (maxPlayers === 4) {
    // 4-Player Bracket: 2 Semifinals -> 1 Final
    // SF0: Seed 1 (creator) vs Seed 4 -> winner to Finals slot 1
    await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.SEMIFINALS,
        matchIndex: 0,
        player1Id: creatorId, // Seed 1
        nextMatchId: finalMatch.id,
        nextMatchSlot: 1,
      },
    });

    // SF1: Seed 2 vs Seed 3 -> winner to Finals slot 2
    await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.SEMIFINALS,
        matchIndex: 1,
        nextMatchId: finalMatch.id,
        nextMatchSlot: 2,
      },
    });
  } else {
    // 8-Player Bracket: 4 Quarterfinals -> 2 Semifinals -> 1 Final
    const sf0 = await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.SEMIFINALS,
        matchIndex: 0,
        nextMatchId: finalMatch.id,
        nextMatchSlot: 1,
      },
    });

    const sf1 = await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.SEMIFINALS,
        matchIndex: 1,
        nextMatchId: finalMatch.id,
        nextMatchSlot: 2,
      },
    });

    // Quarterfinals nodes: QF0 & QF1 -> SF0, QF2 & QF3 -> SF1
    await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.QUARTERFINALS,
        matchIndex: 0,
        player1Id: creatorId, // Seed 1
        nextMatchId: sf0.id,
        nextMatchSlot: 1,
      },
    });

    await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.QUARTERFINALS,
        matchIndex: 1,
        nextMatchId: sf0.id,
        nextMatchSlot: 2,
      },
    });

    await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.QUARTERFINALS,
        matchIndex: 2,
        nextMatchId: sf1.id,
        nextMatchSlot: 1,
      },
    });

    await db.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        round: TournamentMatchRound.QUARTERFINALS,
        matchIndex: 3,
        nextMatchId: sf1.id,
        nextMatchSlot: 2,
      },
    });
  }

  return getTournamentDetails(tournament.id);
};

export const getTournamentDetails = async (tournamentId: string) => {
  return await db.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      creator: {
        select: { id: true, username: true, name: true, avatar_url: true, rating: true },
      },
      winner: {
        select: { id: true, username: true, name: true, avatar_url: true, rating: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, username: true, name: true, avatar_url: true, rating: true },
          },
        },
        orderBy: { seed: "asc" },
      },
      matches: {
        include: {
          player1: {
            select: { id: true, username: true, name: true, avatar_url: true, rating: true },
          },
          player2: {
            select: { id: true, username: true, name: true, avatar_url: true, rating: true },
          },
          winner: {
            select: { id: true, username: true, name: true, avatar_url: true, rating: true },
          },
          match: true,
        },
        orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
      },
      invites: {
        include: {
          receiver: {
            select: { id: true, username: true, name: true, avatar_url: true },
          },
        },
      },
    },
  });
};

export const inviteFriendsToTournament = async (
  io: Server,
  senderId: string,
  tournamentId: string,
  friendUserIds: string[]
) => {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: true },
  });

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== TournamentStatus.WAITING_FOR_PLAYERS) {
    throw new Error("Tournament registration is closed.");
  }

  const maxPlayers = tournament.maxPlayers || 8;
  const currentParticipantCount = tournament.participants.length;
  if (currentParticipantCount >= maxPlayers) {
    throw new Error(`Tournament is full (${maxPlayers}/${maxPlayers} players).`);
  }

  const sender = await db.user.findUnique({
    where: { id: senderId },
    select: { id: true, username: true, name: true, avatar_url: true },
  });

  const invites = [];
  for (const receiverId of friendUserIds) {
    // Check if already participant
    const isParticipant = tournament.participants.some((p) => p.userId === receiverId);
    if (isParticipant) continue;

    try {
      const invite = await db.tournamentInvite.upsert({
        where: {
          tournamentId_receiverId: { tournamentId, receiverId },
        },
        create: {
          tournamentId,
          senderId,
          receiverId,
          status: "PENDING",
        },
        update: {
          status: "PENDING",
        },
      });

      invites.push(invite);

      // Socket push notification to friend
      io.to(`user:${receiverId}`).emit("tournament:invited", {
        tournamentId,
        tournamentTitle: tournament.title,
        sender,
      });
    } catch (e) {
      console.error(`Failed to invite user ${receiverId}:`, e);
    }
  }

  return invites;
};

export const acceptTournamentInvite = async (
  io: Server,
  tournamentId: string,
  userId: string
) => {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: true, matches: true },
  });

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== TournamentStatus.WAITING_FOR_PLAYERS) {
    throw new Error("Tournament has already started or finished.");
  }

  const currentCount = tournament.participants.length;
  const maxPlayers = tournament.maxPlayers || 8;
  if (currentCount >= maxPlayers) {
    throw new Error(`Tournament is full (${maxPlayers}/${maxPlayers} players).`);
  }

  const existing = tournament.participants.find((p) => p.userId === userId);
  if (existing) {
    return await getTournamentDetails(tournamentId);
  }

  const seed = currentCount + 1;

  // Add user as participant
  await db.tournamentParticipant.create({
    data: {
      tournamentId,
      userId,
      seed,
    },
  });

  // Assign user to match slot based on seed
  if (maxPlayers === 4) {
    // 4-Player Seed Mapping:
    // SF0: Seed 1 (slot 1) vs Seed 4 (slot 2)
    // SF1: Seed 2 (slot 1) vs Seed 3 (slot 2)
    let sfIndex = 0;
    let slot = 1;

    if (seed === 2) { sfIndex = 1; slot = 1; }
    else if (seed === 3) { sfIndex = 1; slot = 2; }
    else if (seed === 4) { sfIndex = 0; slot = 2; }

    const sfMatch = tournament.matches.find(
      (m) => m.round === TournamentMatchRound.SEMIFINALS && m.matchIndex === sfIndex
    );

    if (sfMatch) {
      await db.tournamentMatch.update({
        where: { id: sfMatch.id },
        data: slot === 1 ? { player1Id: userId } : { player2Id: userId },
      });
    }
  } else {
    // Standard 8-Player Seed Mapping:
    // QF0: Seed 1 vs Seed 8
    // QF1: Seed 4 vs Seed 5
    // QF2: Seed 2 vs Seed 7
    // QF3: Seed 3 vs Seed 6
    let qfIndex = 0;
    let slot = 1;

    if (seed === 2) { qfIndex = 2; slot = 1; }
    else if (seed === 3) { qfIndex = 3; slot = 1; }
    else if (seed === 4) { qfIndex = 1; slot = 1; }
    else if (seed === 5) { qfIndex = 1; slot = 2; }
    else if (seed === 6) { qfIndex = 3; slot = 2; }
    else if (seed === 7) { qfIndex = 2; slot = 2; }
    else if (seed === 8) { qfIndex = 0; slot = 2; }

    const qfMatch = tournament.matches.find(
      (m) => m.round === TournamentMatchRound.QUARTERFINALS && m.matchIndex === qfIndex
    );

    if (qfMatch) {
      await db.tournamentMatch.update({
        where: { id: qfMatch.id },
        data: slot === 1 ? { player1Id: userId } : { player2Id: userId },
      });
    }
  }

  // Update invite status if exists
  await db.tournamentInvite.updateMany({
    where: { tournamentId, receiverId: userId },
    data: { status: "ACCEPTED" },
  });

  const acceptingUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, avatar_url: true },
  });

  io.to(`tournament:${tournamentId}`).emit("tournament:invite_accepted", {
    tournamentId,
    user: acceptingUser || { id: userId, username: "Player" },
  });

  // Check if tournament is now full
  const updatedParticipantsCount = currentCount + 1;
  if (updatedParticipantsCount === maxPlayers) {
    await startTournamentEngine(io, tournamentId);
  } else {
    // Notify all connected sockets in tournament room
    io.to(`tournament:${tournamentId}`).emit("tournament:updated", await getTournamentDetails(tournamentId));
  }

  return await getTournamentDetails(tournamentId);
};

export const startTournamentEngine = async (io: Server, tournamentId: string) => {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { maxPlayers: true },
  });

  const maxPlayers = tournament?.maxPlayers || 8;
  const startingRound = maxPlayers === 4 ? TournamentMatchRound.SEMIFINALS : TournamentMatchRound.QUARTERFINALS;

  // Update tournament status to IN_PROGRESS
  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.IN_PROGRESS },
  });

  const startingMatches = await db.tournamentMatch.findMany({
    where: { tournamentId, round: startingRound },
    include: { player1: true, player2: true },
  });

  // Create 1v1 Match records for all starting matches
  for (const matchNode of startingMatches) {
    if (matchNode.player1Id && matchNode.player2Id) {
      const match = await createMatch(
        { userId: matchNode.player1Id, socketId: "", joinedAt: Date.now(), rating: matchNode.player1?.rating || 1200 },
        { userId: matchNode.player2Id, socketId: "", joinedAt: Date.now(), rating: matchNode.player2?.rating || 1200 }
      );

      await db.tournamentMatch.update({
        where: { id: matchNode.id },
        data: { matchId: match.id },
      });
    }
  }

  const updatedTournament = await getTournamentDetails(tournamentId);

  // Broadcast tournament start to all connected clients
  io.to(`tournament:${tournamentId}`).emit("tournament:started", updatedTournament);

  const roundLabel = maxPlayers === 4 ? "Semifinal" : "Quarterfinal";

  // Notify each player in starting matches that their match is ready
  for (const p of updatedTournament?.participants || []) {
    io.to(`user:${p.userId}`).emit("tournament:match_ready", {
      tournamentId,
      message: `${roundLabel} Match is Live! Enter Arena!`,
    });
  }
};

export const handleTournamentMatchFinished = async (
  io: Server,
  matchId: string,
  winnerId: string
) => {
  // Check if match belongs to a TournamentMatch
  const tournamentMatch = await db.tournamentMatch.findFirst({
    where: { matchId },
  });

  if (!tournamentMatch) return;

  // Set winner in tournament match
  await db.tournamentMatch.update({
    where: { id: tournamentMatch.id },
    data: { winnerId },
  });

  // Advance winner to next match if present
  if (tournamentMatch.nextMatchId && tournamentMatch.nextMatchSlot) {
    const isSlot1 = tournamentMatch.nextMatchSlot === 1;

    const nextMatch = await db.tournamentMatch.update({
      where: { id: tournamentMatch.nextMatchId },
      data: isSlot1 ? { player1Id: winnerId } : { player2Id: winnerId },
      include: { player1: true, player2: true },
    });

    // Check if next match now has BOTH players
    if (nextMatch.player1Id && nextMatch.player2Id && !nextMatch.matchId) {
      const new1v1Match = await createMatch(
        { userId: nextMatch.player1Id, socketId: "", joinedAt: Date.now(), rating: nextMatch.player1?.rating || 1200 },
        { userId: nextMatch.player2Id, socketId: "", joinedAt: Date.now(), rating: nextMatch.player2?.rating || 1200 }
      );

      await db.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: { matchId: new1v1Match.id },
      });

      // Notify both players that their next round match is ready
      io.to(`user:${nextMatch.player1Id}`).emit("tournament:match_ready", {
        tournamentId: tournamentMatch.tournamentId,
        matchId: new1v1Match.id,
        message: `Your ${nextMatch.round} match is live!`,
      });
      io.to(`user:${nextMatch.player2Id}`).emit("tournament:match_ready", {
        tournamentId: tournamentMatch.tournamentId,
        matchId: new1v1Match.id,
        message: `Your ${nextMatch.round} match is live!`,
      });
    }
  }

  // Check if this was the FINALS match
  if (tournamentMatch.round === TournamentMatchRound.FINALS) {
    await db.tournament.update({
      where: { id: tournamentMatch.tournamentId },
      data: {
        status: TournamentStatus.FINISHED,
        winnerId,
      },
    });

    io.to(`tournament:${tournamentMatch.tournamentId}`).emit(
      "tournament:finished",
      await getTournamentDetails(tournamentMatch.tournamentId)
    );
  } else {
    io.to(`tournament:${tournamentMatch.tournamentId}`).emit(
      "tournament:bracket_updated",
      await getTournamentDetails(tournamentMatch.tournamentId)
    );
  }
};

export const getUserTournaments = async (userId: string) => {
  return await db.tournament.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      creator: { select: { id: true, username: true, avatar_url: true } },
      winner: { select: { id: true, username: true, avatar_url: true } },
      participants: { select: { id: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const cancelTournamentService = async (
  io: Server,
  tournamentId: string,
  userId: string
) => {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: true },
  });

  if (!tournament) throw new Error("Tournament not found");
  if (tournament.creatorId !== userId) {
    throw new Error("Only the tournament creator can cancel this tournament.");
  }
  if (tournament.status === TournamentStatus.FINISHED || tournament.status === TournamentStatus.CANCELLED) {
    throw new Error("Tournament is already finished or cancelled.");
  }

  // 1. Mark tournament CANCELLED
  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.CANCELLED },
  });

  // 2. Mark any pending invites CANCELLED
  const pendingInvites = await db.tournamentInvite.findMany({
    where: { tournamentId, status: "PENDING" },
    select: { receiverId: true },
  });

  await db.tournamentInvite.updateMany({
    where: { tournamentId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  // 3. Mark any active 1v1 matches CANCELLED
  for (const tm of tournament.matches) {
    if (tm.matchId) {
      await db.match.updateMany({
        where: { id: tm.matchId, status: MatchStatus.ACTIVE },
        data: { status: MatchStatus.CANCELLED },
      });
    }
  }

  const updatedDetails = await getTournamentDetails(tournamentId);

  // 4. Broadcast Socket event to all room participants and invited users
  io.to(`tournament:${tournamentId}`).emit("tournament:cancelled", updatedDetails);
  for (const inv of pendingInvites) {
    io.to(`user:${inv.receiverId}`).emit("tournament:cancelled", updatedDetails);
  }

  return updatedDetails;
};

export const declineTournamentInvite = async (
  io: Server,
  tournamentId: string,
  userId: string
) => {
  await db.tournamentInvite.updateMany({
    where: { tournamentId, receiverId: userId },
    data: { status: "DECLINED" },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, avatar_url: true },
  });

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { creatorId: true },
  });

  const payload = {
    tournamentId,
    receiverId: userId,
    user: user || { id: userId, username: "Player" },
  };

  if (tournament) {
    io.to(`user:${tournament.creatorId}`).emit("tournament:invite_declined", payload);
  }

  io.to(`tournament:${tournamentId}`).emit("tournament:invite_declined", payload);

  return { success: true };
};

export const getUserTournamentInvites = async (userId: string) => {
  return await db.tournamentInvite.findMany({
    where: {
      receiverId: userId,
      status: "PENDING",
      tournament: {
        status: TournamentStatus.WAITING_FOR_PLAYERS,
      },
    },
    include: {
      tournament: {
        include: {
          creator: { select: { id: true, username: true, avatar_url: true } },
        },
      },
    },
  });
};
