import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import atletasRoutes from "./routes/atletas.routes.js";
import intentosRoutes from "./routes/intentos.routes.js";
import resultadosRoutes from "./routes/resultados.routes.js";
import tandasRoutes from "./routes/tandas.routes.js";
import juecesRoutes from './routes/jueces.routes.js'
import historicoRoutes from "./routes/historico.routes.js";
import coachesRoutes from "./routes/coaches.routes.js";
import equiposRoutes from "./routes/equipos.routes.js";
import { protectMutations } from "./middlewares/requireAuth.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// protectMutations exige sesión de admin (JWT Supabase) en POST/PUT/PATCH/DELETE;
// los GET quedan abiertos. El router de jueces queda sin protección porque el
// flujo en vivo (votos / control) corre sin login de admin.
app.use("/api/atletas", protectMutations, atletasRoutes);
app.use("/api/intentos", protectMutations, intentosRoutes);
app.use("/api/resultados", protectMutations, resultadosRoutes);
app.use("/api/tandas", protectMutations, tandasRoutes);
app.use('/api/jueces', juecesRoutes)
app.use('/api/historico', protectMutations, historicoRoutes);
app.use('/api/coaches', protectMutations, coachesRoutes);
app.use('/api/equipos', protectMutations, equiposRoutes);
app.get('/ping', (req, res) => res.json({ pong: true, uptime: process.uptime(), timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
