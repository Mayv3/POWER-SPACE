import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Lee atletas + intentos ya mergeados directo desde la view `atletas_con_intentos`,
// sin pasar por Express. Misma forma y orden que /api/intentos/atletas-con-intentos
// (tanda asc, apertura de sentadilla asc -nulls como 0-, desempate por lot).
export async function fetchAtletasConIntentos({ tandaId, atletaId } = {}) {
  let q = supabase.from('atletas_con_intentos').select('*')
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
