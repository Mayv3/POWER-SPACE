import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

console.log("[Supabase] SUPABASE_URL:", process.env.SUPABASE_URL ? process.env.SUPABASE_URL : "❌ NO DEFINIDA");
console.log("[Supabase] SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ definida" : "❌ NO DEFINIDA");

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
