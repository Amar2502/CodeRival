import { db } from "../../config/db";
import { Language, Verdict } from "../../generated/prisma/client";
import { PistonService } from "./piston.service";
import {
  ParamSignature,
  serializeBatchInputToStdin,
  formatExpectedOutput,
  normalizeOutput,
} from "../../utils/inputSerializer";
import { generateDriver, ProblemSignature } from "../../utils/driverGenerator";
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

const CASE_DELIMITER = "===END_CASE===";

export class ExecutionService {
  public static async executeCode(options: ExecutionOptions): Promise<ExecutionResult> {
    const { problemId, language, sourceCode, isSampleOnly } = options;

    if (!sourceCode || !sourceCode.trim()) {
      throw new BadRequestError("Source code cannot be empty");
    }

    // 1. Fetch Problem, Signature, and TestCases (no drivers from DB)
    const problem = await db.problem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
      include: {
        signature: true,
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

    if (!problem.testCases || problem.testCases.length === 0) {
      throw new NotFoundError("No test cases found for this problem");
    }

    // 2. Generate driver on-the-fly from the signature
    const sig: ProblemSignature = {
      functionName: problem.signature.functionName,
      returnType: problem.signature.returnType,
      params: problem.signature.params as unknown as ParamSignature[],
    };
    const driverTemplate = generateDriver(language, sig);
    const wrappedCode = driverTemplate.replace("{{USER_CODE}}", sourceCode);

    const pistonLang = PistonService.getPistonLanguage(language);
    const filename = PistonService.getPistonFilename(language);
    const returnType = sig.returnType;

    // 3. Serialize all test cases into a single batch STDIN payload
    const batchStdin = serializeBatchInputToStdin(problem.testCases, sig.params);

    // 4. Execute single Piston call for ALL test cases
    const startTime = Date.now();
    const pistonRes = await PistonService.execute({
      language: pistonLang,
      files: [{ name: filename, content: wrappedCode }],
      stdin: batchStdin,
      runTimeout: Math.min(problem.timeLimitMs || 3000, 3000),
    });
    const totalRuntimeMs = Date.now() - startTime;

    const testCaseResults: TestCaseExecutionResult[] = [];
    let overallVerdict: Verdict = Verdict.AC;
    let overallStderr: string | undefined = undefined;
    let passedCount = 0;

    // Check Compilation Error (CE)
    if (pistonRes.compile && pistonRes.compile.code !== 0) {
      overallVerdict = Verdict.CE;
      overallStderr = pistonRes.compile.stderr || pistonRes.compile.output;
      for (const testCase of problem.testCases) {
        testCaseResults.push({
          testCaseId: testCase.id,
          order: testCase.order,
          input: testCase.input,
          expected: testCase.expected,
          passed: false,
          stderr: overallStderr,
          verdict: Verdict.CE,
        });
      }
      return {
        verdict: Verdict.CE,
        totalTestCases: problem.testCases.length,
        passedTestCases: 0,
        runtimeMs: totalRuntimeMs,
        stderr: overallStderr,
        testCaseResults,
      };
    }

    // Check Runtime Error (RTE) or Time Limit Exceeded (TLE)
    const isRuntimeOrTimeLimit = pistonRes.run.code !== 0 || !!pistonRes.run.signal;
    if (isRuntimeOrTimeLimit) {
      const isTimeLimit =
        pistonRes.run.signal === "SIGKILL" ||
        (pistonRes.run.output && pistonRes.run.output.includes("Time Limit Exceeded"));
      overallVerdict = isTimeLimit ? Verdict.TLE : Verdict.RTE;
      overallStderr = pistonRes.run.stderr || pistonRes.run.output;
    }

    // 5. Parse output chunks separated by CASE_DELIMITER
    const rawStdout = pistonRes.run.stdout || "";
    const caseOutputs = rawStdout.split(CASE_DELIMITER);

    for (let i = 0; i < problem.testCases.length; i++) {
      const testCase = problem.testCases[i];
      const chunk = caseOutputs[i];

      if (chunk === undefined || (isRuntimeOrTimeLimit && i >= caseOutputs.length - 1)) {
        // Driver crashed before reaching or completing this test case
        testCaseResults.push({
          testCaseId: testCase.id,
          order: testCase.order,
          input: testCase.input,
          expected: testCase.expected,
          passed: false,
          stderr: overallStderr,
          verdict: overallVerdict !== Verdict.AC ? overallVerdict : Verdict.RTE,
        });
        continue;
      }

      const actualStdout = normalizeOutput(chunk);
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
        runtimeMs: Math.round(totalRuntimeMs / problem.testCases.length),
        verdict: tcVerdict,
      });
    }

    return {
      verdict: overallVerdict,
      totalTestCases: problem.testCases.length,
      passedTestCases: passedCount,
      runtimeMs: totalRuntimeMs,
      stderr: overallStderr,
      testCaseResults,
    };
  }
}

