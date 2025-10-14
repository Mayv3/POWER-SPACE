
import express from "express";
import { calcularResultados, getResultados } from "../controllers/resultados.controller.js";

const router = express.Router();

router.get("/", getResultados);
router.post("/calcular", calcularResultados);

export default router;
