import { Server, Socket } from "socket.io";
import { db } from "../../config/db";
import { Language, MatchResult, MatchStatus, SubmissionType } from "../../generated/prisma/client";
import { SubmissionService } from "../../services/submission.service";
import {
  endMatch,
  handleMatchSubmission,
  handlePlayerMatchReconnect,
} from "./match.service";

export const initializeMatchSocket = (
  io: Server,
  socket: Socket
) => {
  const userId = socket.data.user.id;

  socket.on("match:join_room", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    const roomId = `match:${matchId}`;
    socket.join(roomId);
  });

  socket.on("match:reconnect", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    await handlePlayerMatchReconnect(socket, io, matchId);
  });

  socket.on("match:code_sync", async ({ matchId, code, language }: { matchId: string; code: string; language: string }) => {
    if (!matchId) return;
  
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

      const result = await SubmissionService.processSubmission({
        userId,
        problemId: data.problemId,
        matchId: data.matchId,
        language: data.language,
        sourceCode: data.code,
        submissionType: SubmissionType.SUBMIT,
      });

      await handleMatchSubmission(io, data.matchId, userId, result);
    } catch (error: any) {
      console.error("Match submission error:", error);
      socket.emit("match:error", { message: error.message || "Submission execution failed." });
    }
  });

  socket.on("match:leave", async ({ matchId }: { matchId: string }) => {
    if (!matchId) return;
    try {
      const match = await db.match.findUnique({ where: { id: matchId } });
      if (match && match.status === MatchStatus.ACTIVE) {
        const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
        await endMatch(io, matchId, opponentId, MatchResult.ABANDONED);
      }
    } catch (error) {
      console.error("Match leave error:", error);
    }
  });
};