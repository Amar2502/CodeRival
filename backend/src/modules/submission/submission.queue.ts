import { Queue, QueueEvents } from "bullmq";
import { redis } from "../../config/redis";
import { SubmissionJobData } from "./submission.types";

export const SUBMISSION_QUEUE_NAME = "submission";

export const submissionQueue = new Queue<SubmissionJobData>(SUBMISSION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep completed jobs for 24 hours
      count: 1000,    // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
});

export const submissionQueueEvents = new QueueEvents(SUBMISSION_QUEUE_NAME, {
  connection: redis,
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