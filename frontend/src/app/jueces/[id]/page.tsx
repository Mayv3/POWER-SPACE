'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material'
import { supabase } from '../../../lib/supabaseClient'

export default function JuezPage() {
  const { id } = useParams()
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mostrarTipos, setMostrarTipos] = useState(false)

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
    fetchEstado()

    const channel = supabase
      .channel('estado_competencia_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        (payload) => {
          setEstado(payload.new)
          setMostrarTipos(false)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const enviarDecision = async (valido: boolean, tipo?: number) => {
    setMostrarTipos(false)
    const colValido = `juez${id}_valido`
    const colTipo = `juez${id}_tipo`
    const updateData: Record<string, unknown> = { [colValido]: valido, updated_at: new Date() }
    if (!valido && tipo !== undefined) updateData[colTipo] = tipo
    else updateData[colTipo] = null

    const { error } = await supabase.from('estado_competencia').update(updateData).eq('id', 1)
    if (error) console.error('Error al enviar decisión:', error)
  }

  if (loading) return <CircularProgress />

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

  const TIPOS = [
    { tipo: 1, label: 'Tipo 1', sub: 'Nulo / ejecución', bg: '#ff1744', hover: '#d50000' },
    { tipo: 2, label: 'Tipo 2', sub: 'Error durante\nel movimiento', bg: '#1565c0', hover: '#0d47a1' },
    { tipo: 3, label: 'Tipo 3', sub: 'Infracción\nreglamentaria', bg: '#f9a825', hover: '#f57f17', textColor: '#000' },
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
      <Typography variant="h5" fontWeight="bold" color="white">
        {id === '2' ? 'Juez Principal' : `Juez ${id}`}
      </Typography>

      <Typography variant="h6" sx={{ color: estado?.corriendo ? '#00e676' : '#9e9e9e' }}>
        {estado?.corriendo ? 'Intento en curso' : 'Esperando señal'}
      </Typography>

      {/* Indicadores de los 3 jueces */}
      <Stack direction="row" spacing={3} justifyContent="center">
        {[1, 2, 3].map((num) => {
          const v = estado?.[`juez${num}_valido`]
          const t = estado?.[`juez${num}_tipo`]
          const { bg, glow } = getCircleColor(v, t, num === parseInt(String(id)))
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

      {/* Botones de votación */}
      {!yaVote ? (
        mostrarTipos ? (
          <Box sx={{ width: '100%', maxWidth: 380 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 2 }}>
              Seleccioná el tipo de nulo
            </Typography>
            <Stack spacing={2}>
              {TIPOS.map(({ tipo, label, sub, bg, hover, textColor }) => (
                <Button
                  key={tipo}
                  variant="contained"
                  onClick={() => enviarDecision(false, tipo)}
                  sx={{
                    height: 72,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: bg,
                    color: textColor || '#fff',
                    borderRadius: '14px',
                    flexDirection: 'column',
                    gap: 0.3,
                    '&:hover': { backgroundColor: hover },
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.85, whiteSpace: 'pre-line' }}>{sub}</span>
                </Button>
              ))}
            </Stack>
            <Button
              onClick={() => setMostrarTipos(false)}
              sx={{ mt: 2, color: '#666', fontSize: '0.8rem', textTransform: 'none' }}
            >
              Cancelar
            </Button>
          </Box>
        ) : (
          <Stack direction="row" spacing={3} sx={{ width: '100%', maxWidth: 380 }}>
            <Button
              variant="contained"
              onClick={() => enviarDecision(true)}
              sx={{
                flex: 1, height: 100, fontSize: '1.1rem', fontWeight: 'bold',
                backgroundColor: '#ffffff', color: '#000',
                borderRadius: '14px',
                '&:hover': { backgroundColor: '#e0e0e0' },
              }}
            >
              Válido
            </Button>
            <Button
              variant="contained"
              onClick={() => setMostrarTipos(true)}
              sx={{
                flex: 1, height: 100, fontSize: '1.1rem', fontWeight: 'bold',
                backgroundColor: '#ff1744', color: '#fff',
                borderRadius: '14px',
                '&:hover': { backgroundColor: '#d50000' },
              }}
            >
              Nulo
            </Button>
          </Stack>
        )
      ) : (
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
      )}
    </Box>
  )
}
