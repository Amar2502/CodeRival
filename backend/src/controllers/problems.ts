import { Request, Response } from "express";
import { db } from "../config/db";

export const getProblem = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;

    const problem = await db.problem.findUnique({
      where: {
        slug: String(slug),
      },
      include: {
        starterCodes: true,
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
    const topicName = req.params.topicName;
    const userId = req.user?.userId

    const problems = await db.topic.findUnique({
      where: {
        name: String(topicName),
      },
      select: {
        problems: {
          select: {
            problemNumber: true,
            title: true,
            slug: true,
            difficulty: true,
            submissions: {
              where: {
                userId: userId
              },
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    return res.status(200).json({
      problems: problems?.problems || [],
    });
  } catch (error) {
    console.error("Problem Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getAllProblems = async (req: Request, res: Response) => {

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
      },  
      skip: leave,
      take: Number(limit),
    })

    return res.status(200).json({
      problems,
    });

  } catch(error) {
    console.error("Problem Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }

}