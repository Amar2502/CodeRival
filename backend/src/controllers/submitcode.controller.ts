import { Request, Response } from "express";

export const submitCode = async (req: Request, res: Response) => {
  return res.status(200).json({
    verdict: "Accepted",
    status: "SUCCESS",
    passed: true,
    totalTestCases: 10,
    passedTestCases: 10,
    failedTestCase: null,
    executionTime: 24,
    memoryUsed: 16384,
    compileOutput: "",
    stderr: "",
    exitCode: 0,
    signal: null,
  });
};
