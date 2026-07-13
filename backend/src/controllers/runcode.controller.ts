import { Request, Response } from "express";
import axios from "axios";
import { db } from "../config/db";
import { PISTON_LANGUAGES } from "../utils/piston";

export const runCode = async (req: Request, res: Response) => {
  try {
    const { problemId, language, code } = req.body;

    const runtime =
      PISTON_LANGUAGES[language as keyof typeof PISTON_LANGUAGES];

    if (!runtime) {
      return res.status(400).json({
        message: "Unsupported language",
      });
    }

    const problem = await db.problem.findUnique({
      where: {
        id: problemId,
      },
      include: {
        problemTestCases: {
          take: 1,
        },
      },
    });

    if (!problem) {
      return res.status(404).json({
        message: "Problem not found",
      });
    }

    if (problem.problemTestCases.length === 0) {
      return res.status(400).json({
        message: "No test case found.",
      });
    }

    const stdin = problem.problemTestCases[0].input as string;

    const { data } = await axios.post(
      "http://localhost:2000/api/v2/execute",
      {
        language: runtime.language,
        version: runtime.version,
        files: [
          {
            content: code,
          },
        ],
        stdin,
      }
    );

    return res.status(200).json({
      input: stdin,
      output: data.run.stdout,
      stderr: data.run.stderr,
      compileOutput: data.compile?.stderr ?? "",
      exitCode: data.run.code,
      signal: data.run.signal,
    });
  } catch (error: any) {
    console.error(error.response?.data || error);

    return res.status(500).json({
      message: "Failed to run code.",
      error: error.response?.data || error.message,
    });
  }
};