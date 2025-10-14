import express from "express"
import { TANDAS } from "../const/tandas.js"

const router = express.Router()

router.get("/", (req, res) => res.json(TANDAS))

export default router