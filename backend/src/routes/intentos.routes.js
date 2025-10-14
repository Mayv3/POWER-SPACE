import express from "express";
import {
  getIntentos,
  getIntentosByAtleta,
  getIntentosByTanda,
  createIntento,
  updateIntento,
  deleteIntento
} from "../controllers/intentos.controller.js";

const router = express.Router();

router.get("/", getIntentos);
router.get("/atleta/:atleta_id", getIntentosByAtleta);
router.get("/tanda/:tanda_id", getIntentosByTanda);
router.post("/", createIntento);
router.put("/:id", updateIntento);
router.delete("/:id", deleteIntento);

export default router;
