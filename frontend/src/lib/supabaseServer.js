import { createClient } from '@supabase/supabase-js'

// Cliente solo-server para el fetch inicial de SSR. Sin sesión ni realtime:
// son lecturas anónimas de una sola vez por request. La key anon es pública
// (NEXT_PUBLIC_*), así que no expone nada que el cliente no tenga ya.
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Misma forma/orden que fetchAtletasConIntentos del cliente (view atletas_con_intentos).
export async function fetchAtletasConIntentosServer({ tandaId, atletaId } = {}) {
  let q = supabaseServer.from('atletas_con_intentos').select('*')
  if (tandaId && tandaId !== 'todas') q = q.eq('tanda_id', parseInt(tandaId))
  if (atletaId) q = q.eq('id', parseInt(atletaId))
  q = q
    .order('tanda_id', { ascending: true })
    .order('primer_intento_sentadilla', { ascending: true, nullsFirst: true })
    .order('lot', { ascending: true })
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function fetchEstadoCompetenciaServer() {
  const { data } = await supabaseServer
    .from('estado_competencia')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  return data ?? null
}

export async function fetchAtletaServer(id) {
  const { data } = await supabaseServer
    .from('atletas')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data ?? null
}
