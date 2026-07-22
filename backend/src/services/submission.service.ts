import { db } from "../config/db";
import { Language, SubmissionStatus, SubmissionType, Verdict } from "../generated/prisma/client";
import { ExecutionService, ExecutionResult } from "./execution.service";

export interface ProcessSubmissionInput {
  userId: string;
  problemId: string;
  matchId?: string;
  language: Language;
  sourceCode: string;
  submissionType?: SubmissionType;
}

export class SubmissionService {
  public static async processSubmission(input: ProcessSubmissionInput) {
    const { userId, problemId, matchId, language, sourceCode } = input;
    const submissionType = input.submissionType || SubmissionType.SUBMIT;

    const isSampleOnly = submissionType === SubmissionType.RUN;

    // 1. Execute user code against test cases via ExecutionService
    const result: ExecutionResult = await ExecutionService.executeCode({
      problemId,
      language,
      sourceCode,
      isSampleOnly,
    });

    // Resolve the database problem ID if problemId was passed as a slug
    const problem = await db.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
      select: { id: true },
    });

    if (!problem) {
      return result;
    }

    // 2. Persist submission record in DB
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

    // 3. If official submission and AC, check if user solved problem for first time & update stats
    if (submissionType === SubmissionType.SUBMIT && result.verdict === Verdict.AC) {
      const existingAc = await db.submission.findFirst({
        where: {
          userId,
          problemId: problem.id,
          verdict: Verdict.AC,
          id: { not: submission.id },
        },
      });

      if (!existingAc) {
        await db.user.update({
          where: { id: userId },
          data: {
            problemsSolved: { increment: 1 },
          },
        });
      }
    }

    return {
      submissionId: submission.id,
      ...result,
    };
  }

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
      },
    });
  }
}
