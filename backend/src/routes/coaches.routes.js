import express from "express";
import { getCoaches, getCoachById, createCoach, updateCoach, deleteCoach } from "../controllers/coaches.controller.js";

const router = express.Router();

router.get("/", getCoaches);
router.get("/:id", getCoachById);

router.post("/", createCoach);
router.put("/:id", updateCoach);
router.delete("/:id", deleteCoach);

export default router;
