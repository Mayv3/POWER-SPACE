import express from "express";
import { getEquipos, getEquipoById, createEquipo, updateEquipo, deleteEquipo, getPremiacionEquipos } from "../controllers/equipos.controller.js";

const router = express.Router();

router.get("/", getEquipos);
router.get("/premiacion", getPremiacionEquipos); // antes de /:id para no capturarse como id
router.get("/:id", getEquipoById);

router.post("/", createEquipo);
router.put("/:id", updateEquipo);
router.delete("/:id", deleteEquipo);

export default router;
