import { Language, SubmissionStatus, SubmissionType, Verdict } from "../../generated/prisma/client";

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  matchId?: string;
  language: Language;
  sourceCode: string;
  submissionType: SubmissionType;
}

export interface ProcessSubmissionInput {
  userId: string;
  problemId: string;
  matchId?: string;
  language: Language;
  sourceCode: string;
  submissionType?: SubmissionType;
}

export interface SubmissionResponsePayload {
  submissionId: string;
  status: SubmissionStatus;
  verdict?: Verdict | null;
  runtimeMs?: number | null;
  totalTestCases?: number;
  passedTestCases?: number;
  stderr?: string | null;
  testCaseResults?: any;
  submittedAt?: Date;
}
