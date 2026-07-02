'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

// Guard de sesión para /admin. Comprueba la sesión de Supabase (que se cachea
// sola en localStorage y se auto-refresca). Sin sesión -> redirige a /login.
// Reacciona en vivo a logout/expiración vía onAuthStateChange.
//
// Sin spinner: los children se MONTAN ocultos (visibility:hidden) mientras se
// chequea la sesión, así corren su render + data-fetch en background. Cuando hay
// sesión se revelan ya armados (fade in). Sin sesión -> quedan ocultos y redirige.
export default function AuthGuard({ children }) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session) setAuthed(true)
      else router.replace('/login')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session) setAuthed(true)
      else { setAuthed(false); router.replace('/login') }
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  // Children siempre montados (mismo árbol) -> no re-montan al revelar; el estado
  // y los datos ya cargados se conservan. Solo cambia la visibilidad/opacidad.
  return (
    <div
      aria-hidden={!authed}
      style={{
        visibility: authed ? 'visible' : 'hidden',
        opacity: authed ? 1 : 0,
        transition: 'opacity .18s ease',
      }}
    >
      {children}
    </div>
  )
}
