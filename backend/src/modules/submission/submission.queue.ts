import { Queue, QueueEvents } from "bullmq";
import { createBullRedisConnection } from "../../config/redis";
import { SubmissionJobData } from "./submission.types";

export const SUBMISSION_QUEUE_NAME = "submission";

export const submissionQueue = new Queue<SubmissionJobData>(SUBMISSION_QUEUE_NAME, {
  connection: createBullRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600 * 2, // Keep completed jobs for 2 hours (reduced from 24h)
      count: 200,    // Keep last 200 completed jobs (reduced from 1000)
    },
    removeOnFail: {
      age: 3600 * 24, // Keep failed jobs for 24 hours (reduced from 7 days)
      count: 500,     // Keep last 500 failed jobs (reduced from 5000)
    },
  },
});

export const submissionQueueEvents = new QueueEvents(SUBMISSION_QUEUE_NAME, {
  connection: createBullRedisConnection(),
});

/**
 * Adds a submission execution job to the BullMQ queue.
 */
export const addSubmissionToQueue = async (jobData: SubmissionJobData) => {
  const job = await submissionQueue.add("process-submission", jobData, {
    jobId: jobData.submissionId,
  });
  return job;
};

/**
 * Returns current metrics for the submission queue.
 */
export const getSubmissionQueueMetrics = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    submissionQueue.getWaitingCount(),
    submissionQueue.getActiveCount(),
    submissionQueue.getCompletedCount(),
    submissionQueue.getFailedCount(),
    submissionQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
};

/**
 * Gets state of a specific submission job in the queue.
 */
export const getSubmissionJobState = async (submissionId: string) => {
  const job = await submissionQueue.getJob(submissionId);
  if (!job) return null;
  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
  };
};