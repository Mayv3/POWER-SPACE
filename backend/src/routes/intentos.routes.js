import express from "express";
import {
  getIntentos,
  getIntentosByAtleta,
  getIntentosByTanda,
  getAtletasConIntentos,
  createIntento,
  updateIntento,
  deleteIntento,
  upsertIntentoAtleta,
  upsertBatchIntentos
} from "../controllers/intentos.controller.js";

const router = express.Router();

router.get("/", getIntentos);
router.get("/atletas-con-intentos", getAtletasConIntentos);
router.get("/atleta/:atleta_id", getIntentosByAtleta);
router.get("/tanda/:tanda_id", getIntentosByTanda);
router.post("/", createIntento);
router.post("/upsert", upsertIntentoAtleta);
router.post("/upsert-batch", upsertBatchIntentos);
router.put("/:id", updateIntento);
router.delete("/:id", deleteIntento);

export default router;
