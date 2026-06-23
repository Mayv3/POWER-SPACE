import { supabase } from './supabaseClient'

// fetch hacia el backend Express con el access_token de Supabase adjunto.
// Centraliza la base URL (NEXT_PUBLIC_API_URL) y el header Authorization para
// todas las llamadas del admin. Las rutas mutantes del backend exigen este token.
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
  return fetch(url, { ...options, headers })
}
