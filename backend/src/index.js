import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import atletasRoutes from "./routes/atletas.routes.js";
import intentosRoutes from "./routes/intentos.routes.js";
import resultadosRoutes from "./routes/resultados.routes.js";
import tandasRoutes from "./routes/tandas.routes.js";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/atletas", atletasRoutes);
app.use("/api/intentos", intentosRoutes);
app.use("/api/resultados", resultadosRoutes);
app.use("/api/tandas", tandasRoutes);
app.get("/", (req, res) => res.send("Backend Powerlifting activo 💪"));

app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
