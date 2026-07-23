import { supabase } from './supabaseClient'

// fetch hacia el backend Express con el access_token de Supabase adjunto.
// Centraliza la base URL (NEXT_PUBLIC_API_URL) y el header Authorization para
// todas las llamadas del admin. Las rutas mutantes del backend exigen este token.
//
// A diferencia de fetch() crudo, LANZA (throw) si la respuesta no es ok (4xx/5xx).
// fetch solo rechaza ante error de red, no ante 401/500 → sin esto un token
// expirado (401 de protectMutations) o un 500 del backend "resolvían" ok y el
// caller mostraba éxito habiendo perdido la escritura. Ahora el error cae al
// catch del caller (toast + fetchAtletas reconcilia con la DB real).
// En caso ok devuelve el Response intacto: los callers siguen usando res.json().
//
// Uso: apiFetch('/api/atletas', { method: 'POST', ... }) — sin la base URL.
export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { ...(options.headers || {}) }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    // Extraer el { error } del backend si vino como JSON, sin romper si no lo es.
    let detalle = ''
    try { detalle = (await res.clone().json())?.error || '' } catch { /* respuesta no-JSON */ }
    const err = new Error(detalle || `HTTP ${res.status} en ${path}`)
    err.status = res.status
    err.response = res
    throw err
  }
  return res
}
