'use client'

import { useEffect, useState, useRef } from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { supabase } from '../../../lib/supabaseClient'

export default function VistaPublicaPage() {
    const [estadoCompetencia, setEstadoCompetencia] = useState(null)
    const [tiempoLocal, setTiempoLocal] = useState(60)
    const [mostrarResultado, setMostrarResultado] = useState(false)
    const timerRef = useRef(null)
    const resultTimerRef = useRef(null)
    const dismissTimerRef = useRef(null)
    const corridoRef = useRef(false)

    const iniciarTimerLocal = (segundosInicio) => {
        if (timerRef.current) clearInterval(timerRef.current)
        let segundos = segundosInicio
        setTiempoLocal(segundos)
        timerRef.current = setInterval(() => {
            segundos -= 1
            setTiempoLocal(Math.max(0, segundos))
            if (segundos <= 0) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }, 1000)
    }

    useEffect(() => {
        const fetchEstado = async () => {
            const { data, error } = await supabase
                .from('estado_competencia')
                .select('*')
                .eq('id', 1)
                .single()
            if (error || !data) return

            setEstadoCompetencia(data)
            setTiempoLocal(data.tiempo_restante ?? 60)
            corridoRef.current = data.corriendo
            if (data.corriendo) iniciarTimerLocal(data.tiempo_restante ?? 60)
        }
        fetchEstado()

        const channel = supabase
            .channel('public:estado_competencia_vista')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
                (payload) => {
                    const nuevaData = payload.new
                    setEstadoCompetencia(nuevaData)

                    if (nuevaData.corriendo && !corridoRef.current) {
                        iniciarTimerLocal(nuevaData.tiempo_restante ?? 60)
                    } else if (!nuevaData.corriendo && corridoRef.current) {
                        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
                        setTiempoLocal(nuevaData.tiempo_restante ?? 60)
                    }
                    corridoRef.current = nuevaData.corriendo
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    const todosVotaron =
        estadoCompetencia?.juez1_valido !== null && estadoCompetencia?.juez1_valido !== undefined &&
        estadoCompetencia?.juez2_valido !== null && estadoCompetencia?.juez2_valido !== undefined &&
        estadoCompetencia?.juez3_valido !== null && estadoCompetencia?.juez3_valido !== undefined

    // Aparece a los 2s, desaparece solo a los 5s (2s espera + 3s visible)
    useEffect(() => {
        if (todosVotaron) {
            resultTimerRef.current  = setTimeout(() => setMostrarResultado(true),  2000)
            dismissTimerRef.current = setTimeout(() => setMostrarResultado(false), 5000)
        } else {
            clearTimeout(resultTimerRef.current)
            clearTimeout(dismissTimerRef.current)
            setMostrarResultado(false)
        }
        return () => {
            clearTimeout(resultTimerRef.current)
            clearTimeout(dismissTimerRef.current)
        }
    }, [todosVotaron])

    const obtenerNombreEjercicio = (ejercicio) => {
        switch (ejercicio) {
            case 'sentadilla': return 'SENTADILLA'
            case 'banco': return 'PRESS DE BANCO'
            case 'peso_muerto': return 'PESO MUERTO'
            default: return ejercicio?.toUpperCase()
        }
    }

    if (!estadoCompetencia || !estadoCompetencia.atleta_id) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', p: 4 }}>
                <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold' }}>
                    En espera...
                </Typography>
            </Box>
        )
    }

    const nombre = estadoCompetencia.atleta_nombre?.toUpperCase()
    const apellido = estadoCompetencia.atleta_apellido?.toUpperCase()

    const votosValidos = [
        estadoCompetencia.juez1_valido,
        estadoCompetencia.juez2_valido,
        estadoCompetencia.juez3_valido,
    ].filter(v => v === true).length

    const esValido = votosValidos >= 2

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#000', p: 4, my: 'auto', position: 'relative', overflow: 'hidden' }}>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3, mb: 5, width: '100%' }}>

                {/* Tiempo */}
                <Paper elevation={8} sx={{
                    flex: 1, height: '28vh', backgroundColor: 'transparent', color: 'white',
                    borderRadius: 3, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 2,
                }}>
                    <Typography variant="h1" fontWeight="bold">{tiempoLocal}s</Typography>
                    <Typography variant="h5">Tiempo</Typography>
                </Paper>

                {/* Atleta */}
                <Paper elevation={8} sx={{
                    flex: 2, height: '28vh', backgroundColor: '#FFA500', color: 'black',
                    borderRadius: 3, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 3,
                }}>
                    <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
                        {nombre} {apellido}
                    </Typography>
                    <Typography variant="h4" sx={{ mb: 1 }}>
                        {obtenerNombreEjercicio(estadoCompetencia.ejercicio)} - INTENTO {estadoCompetencia.intento}
                    </Typography>
                </Paper>

                {/* Peso */}
                <Paper elevation={8} sx={{
                    flex: 1, height: '28vh', backgroundColor: 'transparent', color: 'white',
                    borderRadius: 3, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 2,
                }}>
                    <Typography variant="h1" fontWeight="bold">{estadoCompetencia.peso ?? 0}</Typography>
                    <Typography variant="h5" fontWeight="bold">KG</Typography>
                </Paper>
            </Box>

            <Paper elevation={0} sx={{ display: 'flex', maxHeight: '400px', backgroundColor: '#000', color: 'white', border: 'none', boxShadow: 'none' }}>
                <Box sx={{ display: 'flex', gap: 3, flexDirection: 'row', width: '100%', height: '60vh', ml: 'auto', alignItems: 'center' }}>
                    <Paper elevation={8} className='aspect-square flex justify-center' sx={{
                        backgroundColor: 'transparent', height: '100%', width: '100%',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        borderRadius: 2, gap: 4,
                    }}>
                        <div className="flex justify-center items-end w-full gap-15">
                            {[1, 2, 3].map((num) => {
                                const valor = estadoCompetencia[`juez${num}_valido`]
                                const tipo = estadoCompetencia[`juez${num}_tipo`]

                                let colorPrincipal, sombra, colorTipo, labelTipo
                                if (!todosVotaron) {
                                    colorPrincipal = '#2e2e2e'
                                    sombra = 'shadow-inner shadow-white/10'
                                    colorTipo = null
                                } else if (valor === true) {
                                    colorPrincipal = '#ffffff'
                                    sombra = 'shadow-[0_0_35px_10px_rgba(255,255,255,0.45)]'
                                    colorTipo = null
                                } else {
                                    colorPrincipal = '#ff1744'
                                    sombra = 'shadow-[0_0_35px_10px_rgba(255,23,68,0.6)]'
                                    if (tipo === 2) { colorTipo = '#1565c0'; labelTipo = 'Técnico' }
                                    else if (tipo === 3) { colorTipo = '#FFD600'; labelTipo = 'Equipo' }
                                }

                                return (
                                    <div key={num} className="flex flex-col items-center gap-3" style={{ width: '27%' }}>
                                        <div
                                            className={`w-full aspect-square rounded-full transition-all duration-300 ${sombra}`}
                                            style={{ backgroundColor: colorPrincipal }}
                                        />
                                        {colorTipo ? (
                                            <div style={{
                                                backgroundColor: colorTipo,
                                                borderRadius: '8px',
                                                width: '22%',
                                                height: '44px',
                                                boxShadow: `0 0 14px 4px ${colorTipo}99`,
                                            }} />
                                        ) : (
                                            <div style={{ height: '36px' }} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </Paper>
                </Box>
            </Paper>

            {/* Banner resultado — pantalla completa, entra desde abajo */}
            <Box sx={{
                position: 'fixed',
                left: 0, right: 0,
                bottom: mostrarResultado ? 0 : '-100vh',
                height: '100vh',
                backgroundColor: esValido ? '#00c853' : '#d50000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'bottom 0.55s cubic-bezier(0.34, 1.2, 0.64, 1)',
                zIndex: 200,
            }}>
                <Typography sx={{
                    fontSize: '12rem',
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: 12,
                    textShadow: esValido
                        ? '0 0 80px rgba(0,255,100,0.4)'
                        : '0 0 80px rgba(255,0,0,0.4)',
                    opacity: mostrarResultado ? 1 : 0,
                    transition: 'opacity 0.25s ease 0.3s',
                    userSelect: 'none',
                }}>
                    {esValido ? 'VÁLIDO' : 'NULO'}
                </Typography>
            </Box>
        </Box>
    )
}
