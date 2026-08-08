import { db } from "../../config/db";
import { Language, SubmissionStatus, SubmissionType, Verdict } from "../../generated/prisma/client";
import { ExecutionService, ExecutionResult } from "./execution.service";
import { addSubmissionToQueue } from "./submission.queue";
import { ProcessSubmissionInput } from "./submission.types";
import { NotFoundError } from "../../utils/errors";
import { submissionEvents } from "./submission.events";
import { calculateUserProblemsSolved } from "../user/user.controller";

export class SubmissionService {
  /**
   * Enqueues a submission for asynchronous execution via BullMQ worker.
   * Creates initial database record in QUEUED state and pushes job to Redis queue.
   */
  public static async createAndEnqueueSubmission(input: ProcessSubmissionInput) {
    const { userId, problemId, matchId, language, sourceCode } = input;
    const submissionType = input.submissionType || SubmissionType.SUBMIT;

    // 1. Resolve problem ID if problemId is a slug or ID
    const problem = await db.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
      select: { id: true },
    });

    if (!problem) {
      throw new NotFoundError("Problem not found");
    }

    // 2. Persist initial Submission record with status QUEUED
    const submission = await db.submission.create({
      data: {
        userId,
        problemId: problem.id,
        matchId: matchId || null,
        language,
        sourceCode,
        submissionType,
        status: SubmissionStatus.QUEUED,
      },
    });

    // 3. Enqueue job to BullMQ
    await addSubmissionToQueue({
      submissionId: submission.id,
      userId,
      problemId: problem.id,
      matchId: matchId || undefined,
      language,
      sourceCode,
      submissionType,
    });

    return {
      submissionId: submission.id,
      problemId: problem.id,
      status: SubmissionStatus.QUEUED,
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * Alias for createAndEnqueueSubmission (default behavior).
   */
  public static async processSubmission(input: ProcessSubmissionInput) {
    return await this.createAndEnqueueSubmission(input);
  }

  /**
   * Direct/Synchronous submission processing without queueing (useful for testing/fallback).
   */
  public static async processSubmissionDirect(input: ProcessSubmissionInput) {
    const { userId, problemId, matchId, language, sourceCode } = input;
    const submissionType = input.submissionType || SubmissionType.SUBMIT;
    const isSampleOnly = submissionType === SubmissionType.RUN;

    const problem = await db.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
      select: { id: true },
    });

    if (!problem) {
      throw new NotFoundError("Problem not found");
    }

    const result: ExecutionResult = await ExecutionService.executeCode({
      problemId: problem.id,
      language,
      sourceCode,
      isSampleOnly,
    });

    const submission = await db.submission.create({
      data: {
        userId,
        problemId: problem.id,
        matchId: matchId || null,
        language,
        sourceCode,
        submissionType,
        status: SubmissionStatus.FINISHED,
        verdict: result.verdict,
        runtimeMs: result.runtimeMs,
        totalTestCases: result.totalTestCases,
        passedTestCases: result.passedTestCases,
        stderr: result.stderr || null,
        testCaseResults: result.testCaseResults as any,
      },
    });

    if (result.verdict === Verdict.AC) {
      const solvedCount = await calculateUserProblemsSolved(userId);
      await db.user.update({
        where: { id: userId },
        data: {
          problemsSolved: solvedCount,
        },
      });
    }

    const payload = {
      submissionId: submission.id,
      problemId: problem.id,
      matchId,
      submissionType,
      status: SubmissionStatus.FINISHED,
      ...result,
    };

    submissionEvents.emit(`submission:${submission.id}`, payload);

    return payload;
  }

  /**
   * Gets details and current execution status of a specific submission.
   */
  public static async getSubmissionById(submissionId: string, userId: string) {
    return await db.submission.findFirst({
      where: {
        id: submissionId,
        userId,
      },
      include: {
        problem: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves all past submissions by a user for a given problem.
   */
  public static async getUserSubmissionsForProblem(problemId: string, userId: string) {
    const problem = await db.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
      select: { id: true },
    });

    if (!problem) return [];

    return await db.submission.findMany({
      where: {
        userId,
        problemId: problem.id,
        submissionType: SubmissionType.SUBMIT,
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        submissionType: true,
        language: true,
        verdict: true,
        runtimeMs: true,
        passedTestCases: true,
        totalTestCases: true,
        submittedAt: true,
        status: true,
      },
    });
  }
}
