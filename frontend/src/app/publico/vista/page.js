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
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 3,
                    mb: 5,
                    width: '100%',
                }}
            >
                {/* 🕒 Tiempo */}
                <Paper
                    elevation={8}
                    sx={{
                        flex: 1,
                        height: '28vh',
                        backgroundColor: 'transparent',
                        color: 'white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        p: 2,
                    }}
                >
                    <Typography variant="h1" fontWeight="bold">
                        {estadoCompetencia?.tiempo_restante ?? 60}s
                    </Typography>
                    <Typography variant="h5">Tiempo</Typography>
                </Paper>

                {/* 🧍 Atleta */}
                <Paper
                    elevation={8}
                    sx={{
                        flex: 2,
                        height: '28vh',
                        backgroundColor: '#FFA500',
                        color: 'black',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        p: 3,
                    }}
                >
                    <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
                        {atletaActual.nombre?.toUpperCase()} {atletaActual.apellido?.toUpperCase()}
                    </Typography>
                    <Typography variant="h4" sx={{ mb: 1 }}>
                        {obtenerNombreEjercicio(estadoCompetencia.ejercicio)} - INTENTO {estadoCompetencia.intento}
                    </Typography>
                </Paper>

                {/* 🏋️ Peso */}
                <Paper
                    elevation={8}
                    sx={{
                        flex: 1,
                        height: '28vh',
                        backgroundColor: 'transparent',
                        color: 'white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        p: 2,
                        
                    }}
                >
                    <Typography variant="h1" fontWeight="bold">
                        {estadoCompetencia?.peso ?? 0}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">KG</Typography>
                </Paper>
            </Box>


            <Paper
                elevation={0}
                sx={{
                    display: 'flex',
                    maxHeight: '400px',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    boxShadow: 'none',
                }}
            >

                <Box sx={{ display: 'flex', gap: 3, flexDirection: 'row', width: '100%', height: '60vh', ml: 'auto', alignItems: 'center' }}>

                    <Paper
                        elevation={8}
                        className='aspect-square flex justify-center'
                        sx={{
                            backgroundColor: 'transparent',
                            height: '100%',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderRadius: 2,
                            gap: 4,
                        }}
                    >

                        <div className="flex justify-center items-center w-full  gap-5">
                            {[1, 2, 3].map((num) => {
                                const valor = estadoCompetencia[`juez${num}_valido`]

                                const color =
                                    valor === true
                                        ? '#ffff'
                                        : valor === false
                                            ? '#ff1744'
                                            : '#2e2e2e'

                                const sombra =
                                    valor === true
                                        ? 'shadow-[0_0_25px_6px_rgba(0,230,118,0.6)]'
                                        : valor === false
                                            ? 'shadow-[0_0_25px_6px_rgba(255,23,68,0.6)]'
                                            : 'shadow-inner shadow-white/10'

                                return (
                                    <div
                                        key={num}
                                        className={`w-full h-full aspect-square  rounded-2xl transition-all duration-300 ${sombra}`}
                                        style={{ backgroundColor: color, }}
                                    />
                                )
                            })}
                        </div>




                    </Paper>

                </Box>
            </Paper>
        </Box>
    )
}
