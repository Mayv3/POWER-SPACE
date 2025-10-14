import express from "express";
import { getAtletas, getAtletaById, createAtleta, deleteAtleta, updateAtleta } from "../controllers/atletas.controller.js";

const router = express.Router();

router.get("/", getAtletas);
router.get("/:id", getAtletaById);

router.post("/", createAtleta);
router.put("/:id", updateAtleta);
router.delete("/:id", deleteAtleta);

export default router;
