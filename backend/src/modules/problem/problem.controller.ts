import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ProblemService } from "./problem.repository";
import { SubmissionService } from "../submission/submission.service";
import { SubmissionStatus, SubmissionType } from "../../generated/prisma/client";
import { submissionEvents } from "../submission/submission.events";

export const getProblem = asyncHandler(async (req: Request, res: Response) => {
  const slug = String(req.params.slug);
  const problem = await ProblemService.getProblemBySlug(slug, req.user?.userId);
  return res.status(200).json({ problem });
});

export const getProblemByTopic = asyncHandler(async (req: Request, res: Response) => {
  const topicName = String(req.params.topicName);
  const problems = await ProblemService.getProblemsByTopic(topicName, req.user?.userId);
  return res.status(200).json({ problems });
});

export const getProblemByDifficulty = asyncHandler(async (req: Request, res: Response) => {
  const difficulty = String(req.params.difficulty);
  const problems = await ProblemService.getProblemsByDifficulty(difficulty, req.user?.userId);
  return res.status(200).json({ problems });
});

export const getAllProblems = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.params.page) || 1;
  const limit = Number(req.params.limit) || 20;
  const { problems, totalCount } = await ProblemService.getAllProblems(page, limit, req.user?.userId);
  return res.status(200).json({ problems, totalCount, page, limit });
});

export const runCode = asyncHandler(async (req: Request, res: Response) => {
  const { problemId, language, sourceCode } = req.body;
  const userId = req.user?.userId || "anonymous";

  const result = await SubmissionService.processSubmission({
    userId,
    problemId,
    language,
    sourceCode,
    submissionType: SubmissionType.RUN,
  });

  return res.status(202).json(result);
});

export const submitCode = asyncHandler(async (req: Request, res: Response) => {
  const { problemId, language, sourceCode, matchId } = req.body;
  const userId = req.user?.userId!;

  const result = await SubmissionService.processSubmission({
    userId,
    problemId,
    matchId,
    language,
    sourceCode,
    submissionType: SubmissionType.SUBMIT,
  });

  return res.status(202).json(result);
});

export const getSubmissionStatus = asyncHandler(async (req: Request, res: Response) => {
  const submissionId = String(req.params.submissionId);
  const userId = req.user?.userId!;

  const submission = await SubmissionService.getSubmissionById(submissionId, userId);

  if (!submission) {
    return res.status(404).json({ message: "Submission not found" });
  }

  return res.status(200).json({ submission });
});

export const streamSubmissionStatus = asyncHandler(async (req: Request, res: Response) => {
  const submissionId = String(req.params.submissionId);
  const userId = req.user?.userId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": ping\n\n");

  const existing = await SubmissionService.getSubmissionById(submissionId, userId!);
  if (existing && existing.status === SubmissionStatus.FINISHED) {
    res.write(`data: ${JSON.stringify({
      submissionId: existing.id,
      status: existing.status,
      verdict: existing.verdict,
      runtimeMs: existing.runtimeMs,
      totalTestCases: existing.totalTestCases,
      passedTestCases: existing.passedTestCases,
      stderr: existing.stderr,
      testCaseResults: existing.testCaseResults,
    })}\n\n`);
    res.end();
    return;
  }

  const onFinished = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  submissionEvents.once(`submission:${submissionId}`, onFinished);

  req.on("close", () => {
    submissionEvents.removeListener(`submission:${submissionId}`, onFinished);
  });
});

export const getUserSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const problemId = String(req.params.problemId);
  const userId = req.user?.userId!;

  const submissions = await SubmissionService.getUserSubmissionsForProblem(problemId, userId);
  return res.status(200).json({ submissions });
});
