import { Server, Socket } from "socket.io";
import { db } from "../../config/db";
import { Language, MatchFinishReason, MatchResult, MatchStatus, SubmissionType } from "../../generated/prisma/client";
import { SubmissionService } from "../submission/submission.service";
import {
  endMatch,
  handlePlayerMatchReconnect,
} from "./match.service";

export const initializeMatchSocket = (
  io: Server,
  socket: Socket
) => {
  const userId = socket.data.user.id;

  socket.on("match:join_room", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    try {
      const match = await db.match.findUnique({
        where: { id: matchId },
        include: { tournamentMatches: true },
      });
      if (!match) {
        socket.emit("match:error", { message: "Match not found." });
        return;
      }

      const isParticipant = match.player1Id === userId || match.player2Id === userId;
      const isTournamentMatch = match.tournamentMatches && match.tournamentMatches.length > 0;

      if (!isParticipant && !isTournamentMatch) {
        socket.emit("match:error", { message: "Access denied: You are not a participant in this 1v1 battle." });
        return;
      }

      const roomId = `match:${matchId}`;
      socket.join(roomId);
    } catch (err) {
      console.error("join_room socket error:", err);
    }
  });

  socket.on("match:reconnect", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    await handlePlayerMatchReconnect(socket, io, matchId);
  });

  socket.on("match:code_sync", async ({ matchId, code, language }: { matchId: string; code: string; language: string }) => {
    if (!matchId) return;
    const match = await db.match.findUnique({ where: { id: matchId } });
    if (!match || (match.player1Id !== userId && match.player2Id !== userId)) return;
  
    socket.to(`match:${matchId}`).emit("match:opponent_code_sync", {
      userId,
      code,
      language,
    });
  });

  socket.on("match:submit", async (data: { matchId: string; problemId: string; code: string; language: Language }) => {
    try {
      if (!data.matchId || !data.problemId || !data.code || !data.language) {
        socket.emit("match:error", { message: "Invalid submission data." });
        return;
      }

      const match = await db.match.findUnique({ where: { id: data.matchId } });
      if (!match || match.status !== MatchStatus.ACTIVE) {
        socket.emit("match:error", { message: "Match is not active." });
        return;
      }

      if (match.player1Id !== userId && match.player2Id !== userId) {
        socket.emit("match:error", { message: "Access denied: Only match participants can submit code." });
        return;
      }

      // Enqueue submission job to BullMQ queue
      const queuedSubmission = await SubmissionService.processSubmission({
        userId,
        problemId: data.problemId,
        matchId: data.matchId,
        language: data.language,
        sourceCode: data.code,
        submissionType: SubmissionType.SUBMIT,
      });

      // Notify opponent in the match room that a submission was made
      socket.to(`match:${data.matchId}`).emit("match:opponent_submitted", {
        userId,
      });

      // Acknowledge queuing to submitting socket
      socket.emit("match:submission_queued", {
        submissionId: queuedSubmission.submissionId,
        status: queuedSubmission.status,
        matchId: data.matchId,
      });
    } catch (error: any) {
      console.error("Match submission error:", error);
      socket.emit("match:error", { message: error.message || "Submission queuing failed." });
    }
  });

  socket.on("match:leave", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    try {
      const match = await db.match.findUnique({ where: { id: matchId } });
      if (match && match.status === MatchStatus.ACTIVE && (match.player1Id === userId || match.player2Id === userId)) {
        const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
        await endMatch(io, matchId, opponentId, MatchResult.ABANDONED, MatchFinishReason.OPPONENT_SURRENDERED);
      }
    } catch (error) {
      console.error("Match leave error:", error);
    }
  });

  socket.on("match:surrender", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    try {
      const match = await db.match.findUnique({ where: { id: matchId } });
      if (match && match.status === MatchStatus.ACTIVE && (match.player1Id === userId || match.player2Id === userId)) {
        const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
        await endMatch(io, matchId, opponentId, MatchResult.ABANDONED, MatchFinishReason.OPPONENT_SURRENDERED);
      }
    } catch (error) {
      console.error("Match surrender error:", error);
    }
  });

  socket.on("match:cheat_disqualify", async ({ matchId, type, details }: { matchId: string; type?: string; details?: string }) => {
    if (!matchId) return;
    try {
      const match = await db.match.findUnique({ where: { id: matchId } });
      if (match && match.status === MatchStatus.ACTIVE && (match.player1Id === userId || match.player2Id === userId)) {
        const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
        await endMatch(io, matchId, opponentId, MatchResult.ABANDONED, MatchFinishReason.OPPONENT_CHEATED);
      }
    } catch (error) {
      console.error("Match cheat disqualify error:", error);
    }
  });

  socket.on(
    "match:anti_cheat_warning",
    async (data: {
      matchId: string;
      type: "TAB_SWITCH" | "PASTE_ATTEMPT" | "WINDOW_RESIZE";
      details?: string;
      warningCount?: number;
    }) => {
      if (!data.matchId) return;
      const match = await db.match.findUnique({ where: { id: data.matchId } });
      if (!match || (match.player1Id !== userId && match.player2Id !== userId)) return;

      socket.to(`match:${data.matchId}`).emit("match:opponent_anti_cheat_warning", {
        userId,
        type: data.type,
        details: data.details,
        warningCount: data.warningCount,
      });
    }
  );
};