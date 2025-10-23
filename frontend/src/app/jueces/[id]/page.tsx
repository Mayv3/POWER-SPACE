'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material'

export default function JuezPage() {
  const { id } = useParams()
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchEstado = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/jueces')
      const data = await res.json()
      setEstado(data)
      setLoading(false)
    } catch (err) {
      console.error('Error al obtener estado:', err)
    }
  }

  useEffect(() => {
    fetchEstado()
    const interval = setInterval(fetchEstado, 1000)
    return () => clearInterval(interval)
  }, [])

  const enviarDecision = async (valido) => {
    try {
      await fetch(`http://localhost:4000/api/jueces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valido }),
      })
    } catch (err) {
      console.error('Error al enviar decisión:', err)
    }
  }

  const iniciarCronometro = async () => {
    try {
      await fetch('http://localhost:4000/api/jueces/start', { method: 'POST' })
    } catch (err) {
      console.error('Error al iniciar cronómetro:', err)
    }
  }

  const detenerCronometro = async () => {
    try {
      await fetch('http://localhost:4000/api/jueces/stop', { method: 'POST' })
    } catch (err) {
      console.error('Error al detener cronómetro:', err)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: '#121212', // fondo oscuro
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" fontWeight="bold" color="white">
        Juez {id}
      </Typography>

      <Typography
        variant="h6"
        sx={{ color: estado?.corriendo ? '#00e676' : '#9e9e9e' }}
      >
        {estado?.corriendo ? 'Intento en curso' : 'Esperando señal'}
      </Typography>

      <Typography variant="h2" fontWeight="bold">
        {estado?.tiempo_restante ?? 60}s
      </Typography>

      <Stack direction="row" spacing={4} justifyContent="center" width="350px">
        {[estado?.juez1_valido, estado?.juez2_valido, estado?.juez3_valido].map(
          (valido, index) => {
            const color =
              valido === true
                ? '#ffffff' // blanco brillante = válido
                : valido === false
                  ? '#ff1744' // rojo fuerte = nulo
                  : '#2e2e2e' // gris oscuro apagado
            return (
              <Box
                key={index}
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: 2,
                  backgroundColor: color,
                  boxShadow:
                    valido === true
                      ? '0 0 20px 4px rgba(255,255,255,0.8)'
                      : valido === false
                        ? '0 0 20px 4px rgba(255,23,68,0.6)'
                        : 'inset 0 0 10px rgba(255,255,255,0.1)',
                  transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                }}
              />
            )
          }
        )}
      </Stack>

      <Stack direction="row" spacing={3} mt={3} width="350px">
        <Button
          variant="contained"
          onClick={() => enviarDecision(true)}
          disabled={estado?.[`juez${id}_valido`] !== null && estado?.[`juez${id}_valido`] !== undefined}
          sx={{
            width: '100%',
            height: 60,
            fontSize: 28,
            fontWeight: 'bold',
            backgroundColor:
              estado?.[`juez${id}_valido`] === true
                ? '#bdbdbd' // gris si ya seleccionó
                : '#ffffff',
            color: '#000000',
            '&:hover': {
              backgroundColor:
                estado?.[`juez${id}_valido`] === true ? '#bdbdbd' : '#e0e0e0',
            },
          }}
        >
        </Button>

        <Button
          variant="contained"
          onClick={() => enviarDecision(false)}
          disabled={estado?.[`juez${id}_valido`] !== null && estado?.[`juez${id}_valido`] !== undefined}
          sx={{
            width: '100%',
            height: 60,
            fontSize: 28,
            fontWeight: 'bold',
            backgroundColor:
              estado?.[`juez${id}_valido`] === false
                ? '#b71c1c'
                : '#ff1744',
            color: '#ffffff',
            '&:hover': {
              backgroundColor:
                estado?.[`juez${id}_valido`] === false ? '#b71c1c' : '#d50000',
            },
          }}
        >
        </Button>
      </Stack>



      {id === '1' && (
        <Stack direction="row" spacing={2} mt={4} width="350px">
          <Button
            variant="contained"
            color="primary"
            onClick={iniciarCronometro}
            disabled={estado?.corriendo}
            sx={{ width: '100%', fontSize: 16 }}
          >
            Iniciar
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={detenerCronometro}
            disabled={!estado?.corriendo}
            sx={{
              width: '100%',
              fontSize: 16,
              borderColor: '#ff1744',
              color: '#ff1744',
            }}
          >
            Detener
          </Button>
        </Stack>
      )}
    </Box>
  )
}
