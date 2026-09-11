import { Worker, Job } from "bullmq";
import { createBullRedisConnection } from "../../config/redis";
import { db } from "../../config/db";
import { SubmissionStatus, SubmissionType, Verdict } from "../../generated/prisma/client";
import { ExecutionService } from "./execution.service";
import { SUBMISSION_QUEUE_NAME } from "./submission.queue";
import { SubmissionJobData } from "./submission.types";
import { getIO } from "../../socket";
import { handleMatchSubmission } from "../match/match.service";
import { submissionEvents } from "./submission.events";
import { calculateUserProblemsSolved } from "../user/user.controller";

let submissionWorker: Worker<SubmissionJobData> | null = null;

/**
 * Worker processor function for handling submission execution jobs.
 */
export const processSubmissionJob = async (job: Job<SubmissionJobData>) => {
  const { submissionId, userId, problemId, matchId, language, sourceCode, submissionType } = job.data;
  console.log(`[SubmissionWorker] Processing job ${job.id} (Submission ID: ${submissionId})`);

  // 1. Update submission status to RUNNING in database
  await db.submission.update({
    where: { id: submissionId },
    data: { status: SubmissionStatus.RUNNING },
  });

  const isSampleOnly = submissionType === SubmissionType.RUN;

  try {
    // 2. Execute user code against test cases via ExecutionService
    const result = await ExecutionService.executeCode({
      problemId,
      language,
      sourceCode,
      isSampleOnly,
    });

    // 3. Update DB submission record with results
    const updatedSubmission = await db.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.FINISHED,
        verdict: result.verdict,
        runtimeMs: result.runtimeMs,
        totalTestCases: result.totalTestCases,
        passedTestCases: result.passedTestCases,
        stderr: result.stderr || null,
        testCaseResults: result.testCaseResults as any,
      },
    });

    // 4. Update user's solved problems count if AC
    if (result.verdict === Verdict.AC) {
      const solvedCount = await calculateUserProblemsSolved(userId);
      await db.user.update({
        where: { id: userId },
        data: {
          problemsSolved: solvedCount,
        },
      });
    }

    // 5. Handle Match Submission if part of a 1v1 battle
    const io = getIO();
    if (matchId && io) {
      try {
        await handleMatchSubmission(io, matchId, userId, result);
      } catch (matchErr) {
        console.error(`[SubmissionWorker] Error updating match ${matchId}:`, matchErr);
      }
    }

    const payload = {
      submissionId,
      problemId,
      matchId,
      submissionType,
      status: SubmissionStatus.FINISHED,
      verdict: result.verdict,
      runtimeMs: result.runtimeMs,
      totalTestCases: result.totalTestCases,
      passedTestCases: result.passedTestCases,
      stderr: result.stderr,
      testCaseResults: result.testCaseResults,
    };

    // 6. Broadcast real-time result via SSE Server-Sent Events
    submissionEvents.emit(`submission:${submissionId}`, payload);

    // 7. Broadcast real-time result to user via Socket.io
    if (io) {
      io.to(`user:${userId}`).emit("submission:result", payload);
    }

    console.log(`[SubmissionWorker] Job ${job.id} finished with verdict: ${result.verdict}`);
    return { submissionId, verdict: result.verdict };
  } catch (error: any) {
    console.error(`[SubmissionWorker] Job ${job.id} failed with error:`, error);

    const errorPayload = {
      submissionId,
      problemId,
      matchId,
      submissionType,
      status: SubmissionStatus.FINISHED,
      verdict: Verdict.IE,
      runtimeMs: 0,
      totalTestCases: 0,
      passedTestCases: 0,
      stderr: error.message || "Execution engine failure",
    };

    // Update database record with Internal Error (IE) verdict
    await db.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.FINISHED,
        verdict: Verdict.IE,
        stderr: error.message || "Execution engine failure",
      },
    });

    // Notify SSE listeners
    submissionEvents.emit(`submission:${submissionId}`, errorPayload);

    // Notify client of failure via socket.io
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit("submission:result", errorPayload);
    }

    throw error;
  }
};

/**
 * Initializes and starts the BullMQ submission worker.
 */
export const startSubmissionWorker = (concurrency: number = Number(process.env.SUBMISSION_WORKER_CONCURRENCY) || 5) => {
  if (submissionWorker) {
    console.log("[SubmissionWorker] Worker already running.");
    return submissionWorker;
  }

  submissionWorker = new Worker<SubmissionJobData>(
    SUBMISSION_QUEUE_NAME,
    processSubmissionJob,
    {
      connection: createBullRedisConnection(),
      concurrency,
    }
  );

  submissionWorker.on("completed", (job) => {
    console.log(`[SubmissionWorker] Job ${job.id} completed successfully`);
  });

  submissionWorker.on("failed", (job, err) => {
    console.error(`[SubmissionWorker] Job ${job?.id} failed: ${err.message}`);
  });

  submissionWorker.on("error", (err) => {
    console.error("[SubmissionWorker] Worker error:", err);
  });

  console.log(`[SubmissionWorker] Worker started with concurrency: ${concurrency}`);
  return submissionWorker;
};

/**
 * Gracefully shuts down the submission worker.
 */
export const stopSubmissionWorker = async () => {
  if (submissionWorker) {
    console.log("[SubmissionWorker] Stopping worker...");
    await submissionWorker.close();
    submissionWorker = null;
    console.log("[SubmissionWorker] Worker stopped.");
  }
};
