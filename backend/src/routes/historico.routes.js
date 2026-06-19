import express from "express";
import {
    getSnapshots,
    getSnapshotDetalle,
    archivar,
    limpiar,
    eliminarSnapshot,
} from "../controllers/historico.controller.js";

const router = express.Router();

router.get("/", getSnapshots);
router.get("/:id", getSnapshotDetalle);
router.post("/archivar", archivar);
router.post("/limpiar", limpiar);
router.delete("/:id", eliminarSnapshot);

export default router;
