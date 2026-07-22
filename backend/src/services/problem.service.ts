import { db } from "../config/db";
import { Difficulty } from "../generated/prisma/client";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class ProblemService {
  static async getProblemBySlug(slug: string, userId?: string) {
    const problem = await db.problem.findUnique({
      where: { slug },
      include: {
        examples: {
          orderBy: { order: "asc" },
        },
        topics: true,
        signature: true,
        starterCodes: true,
        testCases: {
          where: { isSample: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            input: true,
            expected: true,
            order: true,
            isSample: true,
          },
        },
        submissions: userId
          ? {
              where: { userId },
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
                sourceCode: true,
                stderr: true,
                testCaseResults: true,
              },
            }
          : false,
      },
    });

    if (!problem) {
      throw new NotFoundError("Problem not found");
    }

    return problem;
  }

  static async getProblemsByTopic(topicName: string, userId?: string) {
    const problems = await db.problem.findMany({
      where: {
        topics: {
          some: { name: topicName },
        },
      },
      orderBy: { problemNumber: "asc" },
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        submissions: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
      },
    });

    return problems.map((problem) => ({
      problemNumber: problem.problemNumber,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      solved: Array.isArray(problem.submissions) && problem.submissions.length > 0,
    }));
  }

  static async getProblemsByDifficulty(difficultyParam: string, userId?: string) {
    const difficultyMap: Record<string, Difficulty> = {
      easy: Difficulty.EASY,
      medium: Difficulty.MEDIUM,
      hard: Difficulty.HARD,
    };

    const difficulty = difficultyMap[difficultyParam.toLowerCase()];

    if (!difficulty) {
      throw new BadRequestError("Invalid difficulty level");
    }

    const problems = await db.problem.findMany({
      where: { difficulty },
      orderBy: { problemNumber: "asc" },
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        submissions: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
      },
    });

    return problems.map((problem) => ({
      problemNumber: problem.problemNumber,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      solved: Array.isArray(problem.submissions) && problem.submissions.length > 0,
    }));
  }

  static async getAllProblems(page: number, limit: number, userId?: string) {
    const skip = (page - 1) * limit;

    const problems = await db.problem.findMany({
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        topics: {
          select: { name: true },
        },
        submissions: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
      },
      skip,
      take: limit,
    });

    return problems.map((problem) => ({
      problemNumber: problem.problemNumber,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      topics: problem.topics.map((t) => t.name),
      solved: Array.isArray(problem.submissions) && problem.submissions.length > 0,
    }));
  }
}
