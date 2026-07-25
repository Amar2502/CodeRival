import { Router } from "express";
import { getProblem, getProblemByTopic, getAllProblems, getProblemByDifficulty, runCode, submitCode } from "./problem.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { getProblemSchema, getProblemByTopicSchema, getProblemByDifficultySchema, getAllProblemsSchema, runCodeSchema, submitCodeSchema } from "./problem.schema";
import { runCodeLimiter, submitCodeLimiter } from "../submission/submission.ratelimit";

const router = Router();

router.get("/get/:slug", authenticate, validate(getProblemSchema), getProblem);
router.get("/get/by-topic/:topicName", authenticate, validate(getProblemByTopicSchema), getProblemByTopic);
router.get("/get/by-difficulty/:difficulty", authenticate, validate(getProblemByDifficultySchema), getProblemByDifficulty);
router.get("/get/get-all/:page/:limit", authenticate, validate(getAllProblemsSchema), getAllProblems);

router.post("/run", authenticate, runCodeLimiter, validate(runCodeSchema), runCode);
router.post("/submit", authenticate, submitCodeLimiter, validate(submitCodeSchema), submitCode);

export default router;