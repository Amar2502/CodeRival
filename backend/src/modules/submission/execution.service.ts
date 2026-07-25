import { db } from "../../config/db";
import { Language, Verdict } from "../../generated/prisma/client";
import { PistonService } from "./piston.service";
import {
  ParamSignature,
  serializeInputToStdin,
  formatExpectedOutput,
  normalizeOutput,
} from "../../utils/inputSerializer";
import { NotFoundError, BadRequestError } from "../../utils/errors";

export interface ExecutionOptions {
  problemId: string;
  language: Language;
  sourceCode: string;
  isSampleOnly?: boolean;
}

export interface TestCaseExecutionResult {
  testCaseId: string;
  order: number;
  input: any;
  expected: any;
  actualOutput?: string;
  passed: boolean;
  runtimeMs?: number;
  memoryKb?: number;
  stderr?: string;
  verdict: Verdict;
}

export interface ExecutionResult {
  verdict: Verdict;
  totalTestCases: number;
  passedTestCases: number;
  runtimeMs?: number;
  memoryKb?: number;
  stderr?: string;
  testCaseResults: TestCaseExecutionResult[];
}

export class ExecutionService {
  public static async executeCode(options: ExecutionOptions): Promise<ExecutionResult> {
    const { problemId, language, sourceCode, isSampleOnly } = options;

    if (!sourceCode || !sourceCode.trim()) {
      throw new BadRequestError("Source code cannot be empty");
    }

    // 1. Fetch Problem, Signature, Driver, and TestCases
    const problem = await db.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
      include: {
        signature: true,
        drivers: {
          where: { language },
        },
        testCases: {
          where: isSampleOnly ? { isSample: true } : undefined,
          orderBy: { order: "asc" },
        },
      },
    });

    if (!problem) {
      throw new NotFoundError("Problem not found");
    }

    if (!problem.signature) {
      throw new NotFoundError("Problem function signature not defined");
    }

    if (!problem.drivers || problem.drivers.length === 0) {
      throw new NotFoundError(`Execution driver for language ${language} not found`);
    }

    if (!problem.testCases || problem.testCases.length === 0) {
      throw new NotFoundError("No test cases found for this problem");
    }

    const driverTemplate = problem.drivers[0].code;
    const wrappedCode = driverTemplate.replace("{{USER_CODE}}", sourceCode);

    const pistonLang = PistonService.getPistonLanguage(language);
    const filename = PistonService.getPistonFilename(language);
    const params = problem.signature.params as unknown as ParamSignature[];
    const returnType = problem.signature.returnType;

    const testCaseResults: TestCaseExecutionResult[] = [];
    let overallVerdict: Verdict = Verdict.AC;
    let overallStderr: string | undefined = undefined;
    let maxRuntimeMs = 0;
    let passedCount = 0;

    // 2. Iterate through test cases
    for (const testCase of problem.testCases) {
      const args = Array.isArray(testCase.input) ? testCase.input : [testCase.input];
      const stdin = serializeInputToStdin(args, params);

      const startTime = Date.now();
      const pistonRes = await PistonService.execute({
        language: pistonLang,
        files: [{ name: filename, content: wrappedCode }],
        stdin,
        runTimeout: problem.timeLimitMs || 5000,
      });
      const runtimeMs = Date.now() - startTime;

      if (runtimeMs > maxRuntimeMs) {
        maxRuntimeMs = runtimeMs;
      }

      // Check Compilation Error (CE)
      if (pistonRes.compile && pistonRes.compile.code !== 0) {
        overallVerdict = Verdict.CE;
        overallStderr = pistonRes.compile.stderr || pistonRes.compile.output;
        testCaseResults.push({
          testCaseId: testCase.id,
          order: testCase.order,
          input: testCase.input,
          expected: testCase.expected,
          passed: false,
          stderr: overallStderr,
          verdict: Verdict.CE,
        });
        break; // CE stops execution for remaining test cases
      }

      // Check Runtime Error (RTE) or Time Limit Exceeded (TLE)
      if (pistonRes.run.code !== 0 || pistonRes.run.signal) {
        const isTimeLimit =
          pistonRes.run.signal === "SIGKILL" ||
          (pistonRes.run.output && pistonRes.run.output.includes("Time Limit Exceeded"));

        const tcVerdict = isTimeLimit ? Verdict.TLE : Verdict.RTE;
        const errOutput = pistonRes.run.stderr || pistonRes.run.output;

        if (overallVerdict === Verdict.AC) {
          overallVerdict = tcVerdict;
          overallStderr = errOutput;
        }

        testCaseResults.push({
          testCaseId: testCase.id,
          order: testCase.order,
          input: testCase.input,
          expected: testCase.expected,
          passed: false,
          runtimeMs,
          stderr: errOutput,
          verdict: tcVerdict,
        });

        if (!isSampleOnly) {
          break;
        } else {
          continue;
        }
      }

      // Evaluate Output (AC vs WA)
      const actualStdout = normalizeOutput(pistonRes.run.stdout);
      const expectedFormatted = normalizeOutput(formatExpectedOutput(testCase.expected, returnType));
      const passed = actualStdout === expectedFormatted;

      const tcVerdict = passed ? Verdict.AC : Verdict.WA;

      if (passed) {
        passedCount++;
      } else if (overallVerdict === Verdict.AC) {
        overallVerdict = Verdict.WA;
      }

      testCaseResults.push({
        testCaseId: testCase.id,
        order: testCase.order,
        input: testCase.input,
        expected: testCase.expected,
        actualOutput: actualStdout,
        passed,
        runtimeMs,
        verdict: tcVerdict,
      });

      if (!passed && !isSampleOnly) {
        break;
      }
    }

    return {
      verdict: overallVerdict,
      totalTestCases: problem.testCases.length,
      passedTestCases: passedCount,
      runtimeMs: maxRuntimeMs,
      stderr: overallStderr,
      testCaseResults,
    };
  }
}
