import express from "express";
import { getAtletas, getAtletaById, getAtletasByTanda, getAtletasOrderedByTanda, createAtleta, deleteAtleta, updateAtleta, updatePesoCorporal, updateAlturaRack } from "../controllers/atletas.controller.js";

const router = express.Router();

router.get("/", getAtletas);
router.get("/ordenados-por-tanda", getAtletasOrderedByTanda);
router.get("/tanda/:tandaId", getAtletasByTanda);
router.get("/:id", getAtletaById);

router.post("/", createAtleta);
router.patch("/:id/peso-corporal", updatePesoCorporal);
router.patch("/:id/rack", updateAlturaRack);
router.put("/:id", updateAtleta);
router.delete("/:id", deleteAtleta);

export default router;
