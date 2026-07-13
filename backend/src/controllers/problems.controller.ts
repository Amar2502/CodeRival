import { Request, Response } from "express";
import { db } from "../config/db";
import { Difficulty } from "../generated/prisma/client";

export const getProblem = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;

    const problem = await db.problem.findUnique({
      where: {
        slug: String(slug),
      },

      include: {
        examples: true,

        topics: true,

        submissions: {
          where: {
            userId: req.user?.userId,
          },

          select: {
            id: true,
          },

          take: 1,
        },
      },
    });

    if (!problem) {
      return res.status(404).json({
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      problem,
    });
  } catch (error) {
    console.error("Problem Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getProblemByTopic = async (req: Request, res: Response) => {
  try {
    const topicName = req.params.topicName as string;
    const userId = req.user?.userId;

    const problems = await db.problem.findMany({
      where: {
        topics: {
          some: {
            name: topicName,
          },
        },
      },
      orderBy: {
        problemNumber: "asc",
      },
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        submissions: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    const formattedProblems = problems.map((problem) => ({
      problemNumber: problem.problemNumber,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      solved: problem.submissions.length > 0,
    }));

    return res.status(200).json({
      problems: formattedProblems,
    });
  } catch (error) {
    console.error("Problem Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getProblemByDifficulty = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const difficultyMap: Record<string, Difficulty> = {
    easy: Difficulty.EASY,
    medium: Difficulty.MEDIUM,
    hard: Difficulty.HARD,
  };

  const difficultyParam = req.params.difficulty as string;

  const difficulty = difficultyMap[difficultyParam.toLowerCase()];

  if (!difficulty) {
    return res.status(400).json({
      message: "Invalid difficulty level",
    });
  }

  try {
    const problems = await db.problem.findMany({
      where: {
        difficulty,
      },
      orderBy: {
        problemNumber: "asc",
      },
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        submissions: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    const formattedProblems = problems.map((problem) => ({
      problemNumber: problem.problemNumber,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      solved: problem.submissions.length > 0,
    }));

    return res.status(200).json({
      problems: formattedProblems,
    });
  } catch (error) {
    console.error("Problem Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getAllProblems = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  try {
    const page = req.params.page;
    const limit = req.params.limit;

    const leave = (Number(page) - 1) * Number(limit);

    const problems = await db.problem.findMany({
      select: {
        problemNumber: true,
        title: true,
        slug: true,
        difficulty: true,
        topics: {
          select: {
            name: true,
          },
        },
        submissions: {
          where: {
            userId: userId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
      skip: leave,
      take: Number(limit),
    });

    const formattedProblems = problems.map((problem) => ({
      problemNumber: problem.problemNumber,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      topics: problem.topics.map((topic) => topic.name),
      solved: problem.submissions.length > 0,
    }));

    return res.status(200).json({
      problems: formattedProblems,
    });
  } catch (error) {
    console.error("Problem Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
