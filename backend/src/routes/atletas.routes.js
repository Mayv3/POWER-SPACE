import express from "express";
import { getAtletas, getAtletaById, getAtletasByTanda, getAtletasOrderedByTanda, createAtleta, deleteAtleta, updateAtleta } from "../controllers/atletas.controller.js";

const router = express.Router();

router.get("/", getAtletas);
router.get("/ordenados-por-tanda", getAtletasOrderedByTanda);
router.get("/tanda/:tandaId", getAtletasByTanda);
router.get("/:id", getAtletaById);

router.post("/", createAtleta);
router.put("/:id", updateAtleta);
router.delete("/:id", deleteAtleta);

export default router;
