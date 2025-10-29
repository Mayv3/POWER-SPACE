'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, Grid, Paper } from '@mui/material'
import { supabase } from '../../../lib/supabaseClient'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'

export default function VistaPublicaPage() {
    const [estadoCompetencia, setEstadoCompetencia] = useState(null)
    const [atletaActual, setAtletaActual] = useState(null)

    useEffect(() => {
        const fetchEstado = async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces`)
            const data = await res.json()
            setEstadoCompetencia(data)

            if (data.atleta_id) {
                const atletaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${data.atleta_id}`)
                const atletaData = await atletaRes.json()
                setAtletaActual(atletaData)
            }
        }
        fetchEstado()

        const channel = supabase
            .channel('public:estado_competencia_vista')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'estado_competencia',
                    filter: 'id=eq.1',
                },
                async (payload) => {
                    setEstadoCompetencia(payload.new)
                    if (payload.new.atleta_id) {
                        const atletaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${payload.new.atleta_id}`)
                        const atletaData = await atletaRes.json()
                        setAtletaActual(atletaData)
                    } else {
                        setAtletaActual(null)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const obtenerNombreEjercicio = (ejercicio) => {
        switch (ejercicio) {
            case 'sentadilla':
                return 'SENTADILLA'
            case 'banco':
                return 'PRESS DE BANCO'
            case 'peso_muerto':
                return 'PESO MUERTO'
            default:
                return ejercicio?.toUpperCase()
        }
    }

    if (!estadoCompetencia || !atletaActual) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#000',
                    p: 4,
                }}
            >
                <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold' }}>
                    En espera...
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: '#000',
                p: 4,
                my: 'auto',
            }}
        >
            <Paper
                elevation={8}
                sx={{
                    p: 4,
                    mb: 4,
                    backgroundColor: '#FFA500',
                    color: 'black',
                    textAlign: 'center',
                    borderRadius: 2,
                }}
            >
                <Typography variant="h2" fontWeight="bold" sx={{ mb: 2 }}>
                    {atletaActual.nombre?.toUpperCase()} {atletaActual.apellido?.toUpperCase()}
                </Typography>
                <Typography variant="h3" sx={{ mb: 1 }}>
                    {obtenerNombreEjercicio(estadoCompetencia.ejercicio)}
                </Typography>
                <Typography variant="h4">
                    Intento {estadoCompetencia.intento}
                </Typography>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    display: 'flex',
                    maxHeight: '500px',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    boxShadow: 'none',
                }}
            >
                <Box sx={{ display: 'flex', gap: 4, width: '50%' }}>
                    <Paper
                        className='aspect-square'
                        elevation={8}
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            height: '100%',
                            backgroundColor: 'red',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography variant="h1" fontWeight="bold" sx={{ fontSize: '10rem', color: 'white' }}>
                            {estadoCompetencia.peso || 0}
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white' }}>
                            kg
                        </Typography>
                    </Paper>

                    <Paper
                        elevation={8}
                        className='aspect-square'
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            height: '100%',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            variant="h1"
                            fontWeight="bold"
                            sx={{
                                fontSize: '10rem',
                                color: estadoCompetencia.corriendo
                                    ? (estadoCompetencia.tiempo_restante <= 10 ? '#f44336' : '#4caf50')
                                    : 'white',
                            }}
                        >
                            {estadoCompetencia.tiempo_restante ?? 60}
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white' }}>
                            segundos
                        </Typography>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexDirection: 'column', width: '43%', ml: 'auto' }}>
                    <Paper
                        elevation={8}
                        sx={{
                            p: 1,
                            backgroundColor: 'red',
                            display: 'flex',
                            justifyContent: 'center',
                            borderRadius: 1,
                        }}
                    >
                        <Grid container spacing={3} alignItems="center" justifyContent="center">
                            <Grid
                                item
                                xs={6}
                                sm={3}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                            </Grid>

                            <Grid
                                item
                                xs={6}
                                sm={3}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >

                                <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', textAlign: 'center' }}>
                                    {atletaActual.peso_corporal} kg
                                </Typography>
                            </Grid>

                            <Grid
                                item
                                xs={6}
                                sm={3}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >

                                <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', textAlign: 'center' }}>
                                    Tanda {atletaActual.tanda_id}
                                </Typography>
                            </Grid>

                            <Grid
                                item
                                xs={6}
                                sm={3}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >

                                <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', textAlign: 'center' }}>
                                    {atletaActual.modalidad}
                                </Typography>
                            </Grid>
                        </Grid>

                    </Paper>

                    {/* DECISIÓN DE JUECES */}
                    <Paper
                        elevation={8}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            height: '480px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderRadius: 2,
                            gap: 5,
                        }}
                    >
                        <Typography variant="h4" fontWeight="bold" textAlign="center" sx={{ mb: 3, color: 'white' }}>
                            DECISIÓN DE JUECES
                        </Typography>
                        <Grid container spacing={4} justifyContent="center">
                            {[1, 2, 3].map((num) => {
                                const valor = estadoCompetencia[`juez${num}_valido`]

                                const color =
                                    valor === true
                                        ? '#ffffff'
                                        : valor === false
                                            ? '#ff1744'
                                            : '#2e2e2e'

                                const sombra =
                                    valor === true
                                        ? '0 0 20px 4px rgba(255,255,255,0.8)'
                                        : valor === false
                                            ? '0 0 20px 4px rgba(255,23,68,0.6)'
                                            : 'inset 0 0 10px rgba(255,255,255,0.1)'

                                return (
                                    <Grid item xs={12} sm={4} key={num} display="flex" justifyContent="center">
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                width: 200,
                                                height: 200,
                                                borderRadius: 2,
                                                backgroundColor: color,
                                                boxShadow: sombra,
                                                transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                                            }}
                                        />
                                    </Grid>
                                )
                            })}
                        </Grid>


                    </Paper>
                </Box>
            </Paper>
        </Box>
    )
}
