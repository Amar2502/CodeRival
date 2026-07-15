import { Request, Response } from "express";

export const runCode = async (req: Request, res: Response) => {
  return res.status(200).json({
    input: "Mock input",
    output: "Mock output",
    stderr: "",
    compileOutput: "",
    exitCode: 0,
    signal: null,
  });
};
