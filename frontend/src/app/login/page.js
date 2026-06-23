'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, TextField, Typography, CircularProgress, InputAdornment, IconButton,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { supabase } from '../../lib/supabaseClient'

/* paleta de marca (igual que /publico) */
const T = {
  bg: '#08090b', card: '#101318', lime: '#c0f93b',
  txt: '#f4f5f7', txt2: '#9aa0ab', txt3: '#6b7280',
  line: 'rgba(255,255,255,.10)', fail: '#ef5a54',
}
const FO = "'Oswald',sans-serif"
const FB = "'Barlow',sans-serif"

const fieldSx = {
  mb: 2,
  '& .MuiInputBase-root': {
    fontFamily: FB, color: T.txt, background: 'rgba(255,255,255,.03)', borderRadius: '13px',
  },
  '& .MuiInputBase-input': { color: T.txt },
  '& .MuiInputLabel-root': { fontFamily: FB, color: T.txt3 },
  '& .MuiInputLabel-root.Mui-focused': { color: T.lime },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.line },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.22)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.lime, borderWidth: 1.5 },
  '& .MuiSvgIcon-root': { color: T.txt3 },
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Si ya hay sesión cacheada, entra directo al admin (no re-login).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/admin')
      else setChecking(false)
    })
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      setError('Email o contraseña incorrectos')
      return
    }
    router.replace('/admin')
  }

  if (checking) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: T.bg }}>
        <CircularProgress sx={{ color: T.lime }} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
        position: 'relative', overflow: 'hidden',
        background: `radial-gradient(1100px 700px at 50% -10%, rgba(192,249,59,.10), transparent 60%), ${T.bg}`,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap');
        @keyframes lgIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* línea lime arriba */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${T.lime},transparent)` }} />

      <Box
        sx={{
          width: '100%', maxWidth: 400, p: { xs: 3.5, sm: 5 }, borderRadius: '26px',
          background: T.card, border: `1px solid ${T.line}`,
          boxShadow: '0 30px 80px rgba(0,0,0,.55)',
          animation: 'lgIn .5s cubic-bezier(.22,.61,.36,1) both',
        }}
      >
        {/* logo + marca */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box
            component="img" src="/powerspace_logo.png" alt="POWERSPACE"
            sx={{
              width: 76, height: 76, borderRadius: '20px', objectFit: 'cover', mb: 2.5,
              border: `1px solid ${T.line}`, boxShadow: '0 10px 30px rgba(192,249,59,.18)',
            }}
          />
          <Box sx={{ position: 'relative', pb: '7px' }}>
            <Typography sx={{ fontFamily: FO, fontWeight: 700, fontSize: 30, letterSpacing: '.04em', color: T.txt, lineHeight: 1 }}>
              POWERSPACE
            </Typography>
            <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 46, height: 4, background: T.lime, borderRadius: 2 }} />
          </Box>
          <Typography sx={{ fontFamily: FB, fontSize: 13, letterSpacing: '.16em', color: T.txt3, mt: 1.5, textTransform: 'uppercase' }}>
            Panel de administración
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {error && (
            <Box sx={{
              mb: 2, px: 1.75, py: 1.25, borderRadius: '11px', display: 'flex', alignItems: 'center', gap: 1,
              background: 'rgba(239,90,84,.10)', border: '1px solid rgba(239,90,84,.35)',
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: T.fail, flex: 'none' }} />
              <Typography sx={{ fontFamily: FB, fontSize: 13, color: T.fail }}>{error}</Typography>
            </Box>
          )}

          <TextField
            label="Email" type="email" fullWidth required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            sx={fieldSx}
          />
          <TextField
            label="Contraseña" type={showPass ? 'text' : 'password'} fullWidth required
            value={password} onChange={(e) => setPassword(e.target.value)}
            sx={{ ...fieldSx, mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPass((v) => !v)} edge="end" sx={{ color: T.txt3 }}>
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box
            component="button" type="submit" disabled={loading}
            sx={{
              width: '100%', height: 52, border: 'none', borderRadius: '14px', cursor: loading ? 'default' : 'pointer',
              background: T.lime, color: '#0b0d0a', fontFamily: FO, fontWeight: 700, fontSize: 16, letterSpacing: '.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform .15s ease, box-shadow .2s ease, opacity .2s ease',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 8px 24px rgba(192,249,59,.25)',
              '&:hover': loading ? {} : { transform: 'translateY(-1px)', boxShadow: '0 12px 30px rgba(192,249,59,.35)' },
              '&:active': loading ? {} : { transform: 'translateY(0)' },
            }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: '#0b0d0a' }} /> : 'INGRESAR'}
          </Box>
        </form>
      </Box>

      <Typography sx={{ position: 'fixed', bottom: 18, fontFamily: FB, fontSize: 10, letterSpacing: '.2em', color: T.txt3, opacity: .7 }}>
        POWERSPACE
      </Typography>
    </Box>
  )
}
