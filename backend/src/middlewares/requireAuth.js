import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Cliente liviano para validar el JWT del usuario contra el server de Auth de
// Supabase. No persiste sesión (es server, stateless por request).
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Exige un Bearer token válido. Adjunta req.user si pasa.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No autorizado: falta token" });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "No autorizado: token inválido" });
    }
    req.user = data.user;
    next();
  } catch (e) {
    console.error("requireAuth error:", e);
    return res.status(401).json({ error: "No autorizado" });
  }
}

// Protege solo los métodos que mutan datos; deja pasar lecturas (GET/HEAD/OPTIONS).
export function protectMutations(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  return next();
}
