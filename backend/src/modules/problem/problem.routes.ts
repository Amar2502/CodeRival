import { Router } from "express";
import { getProblem, getProblemByTopic, getAllProblems, getProblemByDifficulty } from "./problem.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { getProblemSchema, getProblemByTopicSchema, getProblemByDifficultySchema, getAllProblemsSchema}  from "./problem.schema";

const router = Router();

router.get("/get/:slug", authenticate, validate(getProblemSchema), getProblem);
router.get("/get/by-topic/:topicName", authenticate, validate(getProblemByTopicSchema), getProblemByTopic);
router.get("/get/by-difficulty/:difficulty", authenticate, validate(getProblemByDifficultySchema), getProblemByDifficulty);
router.get("/get/get-all/:page/:limit", authenticate, validate( getAllProblemsSchema), getAllProblems);

export default router;