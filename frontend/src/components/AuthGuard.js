'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress } from '@mui/material'
import { supabase } from '../lib/supabaseClient'

// Guard de sesión para /admin. Comprueba la sesión de Supabase (que se cachea
// sola en localStorage y se auto-refresca). Sin sesión -> redirige a /login.
// Reacciona en vivo a logout/expiración vía onAuthStateChange.
export default function AuthGuard({ children }) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session) { setAuthed(true); setChecking(false) }
      else { router.replace('/login') }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session) { setAuthed(true); setChecking(false) }
      else { setAuthed(false); router.replace('/login') }
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [router])

  if (checking || !authed) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return children
}
