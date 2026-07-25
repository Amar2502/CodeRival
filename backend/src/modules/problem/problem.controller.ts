import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ProblemService } from "./problem.repository";
import { SubmissionService } from "../submission/submission.service";
import { SubmissionType } from "../../generated/prisma/client";

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
  const page = Number(req.params.page);
  const limit = Number(req.params.limit);
  const problems = await ProblemService.getAllProblems(page, limit, req.user?.userId);
  return res.status(200).json({ problems });
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

  return res.status(200).json(result);
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

  return res.status(200).json(result);
});
