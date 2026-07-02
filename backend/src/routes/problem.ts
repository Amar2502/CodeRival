import { Router } from "express";
import { getProblem, getProblemByTopic, getAllProblems } from "../controllers/problems";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/get/:slug", authenticate, getProblem);
router.get("/get/by-topic/:topicName", authenticate, getProblemByTopic);
router.get("/get/get-all/:page/:limit", authenticate, getAllProblems);

export default router;