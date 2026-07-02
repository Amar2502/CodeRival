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
        testCases: true,
        topics: true,
      }
    });

    if (!problem) {
      return res.status(404).json({
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      problem
    });

  } catch (error) {
    console.error("Problem Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
