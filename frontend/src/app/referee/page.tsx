'use client'

import { useEffect, useState, useRef } from 'react'
import { Box, Button, Typography, Stack, Skeleton, Fade, Grow } from '@mui/material'
import { supabase } from '../../lib/supabaseClient'
import { joinCompetenciaLive } from '../../lib/competenciaLive'
import { apiFetch } from '../../lib/api'

const STORAGE_KEY = 'ps_referee_id'

const REFEREES = [
  { id: '1', nombre: 'Referee Izquierda', rol: 'Lateral izquierdo', color: '#1976d2' },
  { id: '2', nombre: 'Referee Central', rol: 'Central', color: '#388e3c' },
  { id: '3', nombre: 'Referee Derecha', rol: 'Lateral derecho', color: '#d32f2f' },
]

// Evita destello blanco: mismo fondo oscuro que las pantallas de picker/voto
// mientras se resuelve el estado inicial (localStorage o fetch a Supabase).
// Skeleton en vez de spinner para no cortar el layout de golpe cuando carga.
function DarkLoader() {
  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#0d0d0d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      px: 3,
    }}>
      <Skeleton variant="text" width={180} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.11)' }} />
      <Skeleton variant="text" width={140} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
      <Stack direction="row" spacing={3} justifyContent="center">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} variant="circular" width={64} height={64} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        ))}
      </Stack>
      <Stack direction="row" spacing={3} sx={{ width: '100%', maxWidth: 380 }}>
        <Skeleton variant="rounded" sx={{ flex: 1, height: 100, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Skeleton variant="rounded" sx={{ flex: 1, height: 100, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.08)' }} />
      </Stack>
    </Box>
  )
}

export default function RefereePage() {
  const [id, setId] = useState<string | null>(null)
  const [pickerReady, setPickerReady] = useState(false)
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const liveRef = useRef<{ send: (p: Record<string, unknown>) => void; leave: () => void } | null>(null)

  // Restaurar el rol elegido en este dispositivo (si ya lo eligió antes).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) setId(saved)
    setPickerReady(true)
  }, [])

  const elegirReferee = (refereeId: string) => {
    window.localStorage.setItem(STORAGE_KEY, refereeId)
    setId(refereeId)
  }

  const cambiarReferee = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setId(null)
    setEstado(null)
    setLoading(true)
  }

  const fetchEstado = async () => {
    try {
      const { data, error } = await supabase
        .from('estado_competencia')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) throw error
      setEstado(data)
      setLoading(false)
    } catch (err) {
      console.error('Error al obtener estado:', err)
    }
  }

  useEffect(() => {
    if (!id) return

    fetchEstado()

    const channel = supabase
      .channel('estado_competencia_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        (payload) => {
          setEstado(payload.new)
        }
      )
      .subscribe()

    // Canal de broadcast: emite el voto al instante a la vista pública.
    liveRef.current = joinCompetenciaLive()

    return () => { supabase.removeChannel(channel); liveRef.current?.leave() }
  }, [id])

  const enviarDecision = async (valido: boolean, tipo?: number) => {
    const colValido = `juez${id}_valido`
    const colTipo = `juez${id}_tipo`
    const partial: Record<string, unknown> = {
      [colValido]: valido,
      [colTipo]: (!valido && tipo !== undefined) ? tipo : null,
    }
    // 1) Fast-path: la luz aparece en la vista en ~50-150ms (no espera al WAL).
    liveRef.current?.send(partial)
    // 2) El backend persiste el voto y, si es el tercero, registra el intento.
    // Así el resultado no depende de que Cargadores esté abierto.
    try {
      await apiFetch(`/api/jueces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valido, tipo }),
      })
    } catch (error) {
      console.error('Error al enviar decisión:', error)
    }
  }

  if (!pickerReady) return <DarkLoader />

  // Sin rol elegido todavía: mostrar selector de referee.
  if (!id) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#0d0d0d',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        textAlign: 'center',
        px: 3,
      }}>
        <Fade in timeout={400}>
          <Typography variant="h5" fontWeight="bold">¿Qué referee sos?</Typography>
        </Fade>
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 380 }}>
          {REFEREES.map((r, i) => (
            <Fade in timeout={400} style={{ transitionDelay: `${100 + i * 80}ms` }} key={r.id}>
              <Button
                variant="contained"
                onClick={() => elegirReferee(r.id)}
                sx={{
                  height: 84,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backgroundColor: r.color,
                  borderRadius: '14px',
                  flexDirection: 'column',
                  gap: 0.3,
                  '&:hover': { backgroundColor: r.color, filter: 'brightness(0.9)' },
                }}
              >
                <span>{r.nombre}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.85 }}>{r.rol}</span>
              </Button>
            </Fade>
          ))}
        </Stack>
      </Box>
    )
  }

  if (loading) return <DarkLoader />

  const miVoto = estado?.[`juez${id}_valido`]
  const miTipo = estado?.[`juez${id}_tipo`]
  const yaVote = miVoto !== null && miVoto !== undefined

  const todosVotaron =
    estado?.juez1_valido !== null && estado?.juez1_valido !== undefined &&
    estado?.juez2_valido !== null && estado?.juez2_valido !== undefined &&
    estado?.juez3_valido !== null && estado?.juez3_valido !== undefined

  const getCircleColor = (valido: boolean | null, tipo: number | null, esEsteJuez: boolean) => {
    const mostrar = esEsteJuez || todosVotaron
    if (!mostrar || valido === null || valido === undefined) return { bg: '#2e2e2e', glow: 'inset 0 0 10px rgba(255,255,255,0.1)' }
    if (valido === true) return { bg: '#ffffff', glow: '0 0 28px 8px rgba(255,255,255,0.7)' }
    if (tipo === 2) return { bg: '#1565c0', glow: '0 0 28px 8px rgba(21,101,192,0.7)' }
    if (tipo === 3) return { bg: '#f9a825', glow: '0 0 28px 8px rgba(249,168,37,0.7)' }
    return { bg: '#ff1744', glow: '0 0 28px 8px rgba(255,23,68,0.7)' }
  }

  const VOTOS = [
    { valido: true, tipo: undefined, label: 'Válido', bg: '#ffffff', glow: 'rgba(255,255,255,0.6)' },
    { valido: false, tipo: 1, label: 'Nulo · Tipo 1', bg: '#ff1744', glow: 'rgba(255,23,68,0.6)' },
    { valido: false, tipo: 2, label: 'Nulo · Tipo 2', bg: '#1565c0', glow: 'rgba(21,101,192,0.6)' },
    { valido: false, tipo: 3, label: 'Nulo · Tipo 3', bg: '#f9a825', glow: 'rgba(249,168,37,0.6)' },
  ]

  return (
    <Box sx={{
      height: '100vh',
      backgroundColor: '#0d0d0d',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      textAlign: 'center',
      px: 3,
    }}>
      <Fade in timeout={400}>
        <Typography variant="h5" fontWeight="bold" color="white">
          {id === '1' ? 'Referee Izquierda' : id === '3' ? 'Referee Derecha' : 'Referee Central'}
        </Typography>
      </Fade>

      <Fade in timeout={400} style={{ transitionDelay: '80ms' }}>
        <Typography variant="h6" sx={{ color: estado?.corriendo ? '#00e676' : '#9e9e9e' }}>
          {estado?.corriendo ? 'Intento en curso' : 'Esperando señal'}
        </Typography>
      </Fade>

      {/* Indicadores de los 3 jueces */}
      <Fade in timeout={400} style={{ transitionDelay: '160ms' }}>
        <Stack direction="row" spacing={3} justifyContent="center">
          {[1, 2, 3].map((num) => {
            const v = estado?.[`juez${num}_valido`]
            const t = estado?.[`juez${num}_tipo`]
            const { bg, glow } = getCircleColor(v, t, String(num) === id)
            return (
              <Box key={num} sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: bg,
                boxShadow: glow,
                transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
              }} />
            )
          })}
        </Stack>
      </Fade>

      {/* Botones de votación: 4 círculos directos, de a 2 por fila */}
      {!yaVote ? (
        <Fade in timeout={350}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 3,
            justifyItems: 'center',
            width: '100%',
            maxWidth: 400,
          }}>
            {VOTOS.map(({ valido, tipo, label, bg, glow }, i) => (
              <Fade in timeout={350} style={{ transitionDelay: `${i * 70}ms` }} key={label}>
                <Box
                  role="button"
                  aria-label={label}
                  onClick={() => enviarDecision(valido, tipo)}
                  sx={{
                    width: 130,
                    height: 130,
                    borderRadius: '50%',
                    backgroundColor: bg,
                    cursor: 'pointer',
                    boxShadow: `0 0 18px 3px ${glow}`,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': { transform: 'scale(1.08)', boxShadow: `0 0 26px 6px ${glow}` },
                    '&:active': { transform: 'scale(0.95)' },
                  }}
                />
              </Fade>
            ))}
          </Box>
        </Fade>
      ) : (
        <Grow in timeout={400}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{
              width: 120, height: 120, borderRadius: '50%', mx: 'auto', mb: 2,
              backgroundColor: miVoto === true ? '#ffffff' : miTipo === 2 ? '#1565c0' : miTipo === 3 ? '#f9a825' : '#ff1744',
              boxShadow: miVoto === true
                ? '0 0 40px 12px rgba(255,255,255,0.5)'
                : miTipo === 2
                  ? '0 0 40px 12px rgba(21,101,192,0.5)'
                  : miTipo === 3
                    ? '0 0 40px 12px rgba(249,168,37,0.5)'
                    : '0 0 40px 12px rgba(255,23,68,0.5)',
            }} />
            <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>
              {miVoto === true
                ? 'Votaste: Válido'
                : miTipo === 2
                  ? 'Votaste: Nulo tipo 2 (azul)'
                  : miTipo === 3
                    ? 'Votaste: Nulo tipo 3 (amarillo)'
                    : 'Votaste: Nulo tipo 1 (rojo)'}
            </Typography>
          </Box>
        </Grow>
      )}

      <Button
        onClick={cambiarReferee}
        sx={{ mt: 1, color: '#555', fontSize: '0.72rem', textTransform: 'none' }}
      >
        Cambiar referee
      </Button>
    </Box>
  )
}
