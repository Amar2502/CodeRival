import { Router } from "express";
import { getProblem, getProblemByTopic, getAllProblems, getProblemByDifficulty } from "../controllers/problems.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/get/:slug", authenticate, getProblem);
router.get("/get/by-topic/:topicName", authenticate, getProblemByTopic);
router.get("/get/by-difficulty/:difficulty", authenticate, getProblemByDifficulty);
router.get("/get/get-all/:page/:limit", authenticate, getAllProblems);

export default router;