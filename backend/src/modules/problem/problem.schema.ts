import { z } from "zod";

export const getProblemSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1),
  }),
});

export const getProblemByTopicSchema = z.object({
  params: z.object({
    topicName: z.string().trim().min(1),
  }),
});

export const getProblemByDifficultySchema = z.object({
  params: z.object({
    difficulty: z.enum(["easy", "medium", "hard"]),
  }),
});

export const getAllProblemsSchema = z.object({
  params: z.object({
    page: z.coerce.number().int().positive(),

    limit: z.coerce.number().int().min(1).max(100),
  }),
});

export const runCodeSchema = z.object({
  body: z.object({
    problemId: z.string().trim().min(1),
    language: z.enum(["CPP", "JAVA", "PYTHON"]),
    sourceCode: z.string().min(1),
  }),
});

export const submitCodeSchema = z.object({
  body: z.object({
    problemId: z.string().trim().min(1),
    language: z.enum(["CPP", "JAVA", "PYTHON"]),
    sourceCode: z.string().min(1),
    matchId: z.string().optional(),
  }),
});