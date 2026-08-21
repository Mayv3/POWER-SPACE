'use client'

import { useEffect, useState, useRef } from 'react'
import { Box, Typography, Paper, Avatar } from '@mui/material'
import { UsersThree as GroupsIcon, User as PersonIcon } from '@phosphor-icons/react'
import { supabase, fetchAtletasConIntentos } from '../../../lib/supabaseClient'
import { joinCompetenciaLive } from '../../../lib/competenciaLive'

export default function VistaClient({ initialEstado = null }) {
    const [estadoCompetencia, setEstadoCompetencia] = useState(initialEstado)
    const [tiempoLocal, setTiempoLocal] = useState(initialEstado?.tiempo_restante ?? 60)
    const timerRef = useRef(null)
    const corridoRef = useRef(false)

    // Presentación animada del equipo + coach al seleccionar un atleta
    const [presentacion, setPresentacion] = useState(null)
    const [mostrarPresentacion, setMostrarPresentacion] = useState(false)
    const [solicitudPresentacion, setSolicitudPresentacion] = useState(() => (
        initialEstado?.atleta_id
            ? {
                atletaId: initialEstado.atleta_id,
                atletaNombre: initialEstado.atleta_nombre,
                atletaApellido: initialEstado.atleta_apellido,
                clave: 0,
            }
            : null
    ))
    const presentSeqRef = useRef(0)
    const presentFetchSeqRef = useRef(0)
    const presentTimerRef = useRef(null)
    const presentFrameRef = useRef(null)

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
        let activo = true
        let recibioCambioEnVivo = false
        let lastPresentedAtletaId = initialEstado?.atleta_id == null ? null : String(initialEstado.atleta_id)

        const solicitarPresentacion = (incoming) => {
            if (!activo) return
            const atletaId = incoming?.atleta_id
            if (atletaId == null || atletaId === '') return
            lastPresentedAtletaId = String(atletaId)
            presentSeqRef.current += 1
            setSolicitudPresentacion({
                atletaId,
                atletaNombre: incoming.atleta_nombre,
                atletaApellido: incoming.atleta_apellido,
                atletaFoto: incoming.atleta_foto,
                equipoNombre: incoming.equipo_nombre,
                equipoColor: incoming.equipo_color,
                equipoFoto: incoming.equipo_foto,
                coachNombre: incoming.coach_nombre,
                coachFoto: incoming.coach_foto,
                fichaCompleta: incoming.ficha_completa === true,
                clave: presentSeqRef.current,
            })
        }

        // Aplica un cambio de estado. full=fila completa (postgres_changes); parcial=broadcast (merge).
        const aplicarEstado = (incoming, full) => {
            if (!activo) return
            recibioCambioEnVivo = true
            setEstadoCompetencia(prev => (full ? incoming : (prev ? { ...prev, ...incoming } : prev)))
            if (full) {
                const nextAtletaId = incoming?.atleta_id == null ? null : String(incoming.atleta_id)
                if (nextAtletaId && nextAtletaId !== lastPresentedAtletaId) solicitarPresentacion(incoming)
                if (!nextAtletaId) lastPresentedAtletaId = null
            }
            if (incoming.corriendo !== undefined && incoming.corriendo !== null) {
                if (incoming.corriendo && !corridoRef.current) {
                    iniciarTimerLocal(incoming.tiempo_restante ?? 60)
                } else if (!incoming.corriendo && corridoRef.current) {
                    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
                    setTiempoLocal(incoming.tiempo_restante ?? 60)
                }
                corridoRef.current = incoming.corriendo
            }
        }

        const fetchEstado = async () => {
            const { data, error } = await supabase
                .from('estado_competencia')
                .select('*')
                .eq('id', 1)
                .single()
            // Si mientras esperábamos llegó Broadcast o Realtime, esa versión es
            // más reciente que esta lectura inicial y no debe ser sobrescrita.
            if (!activo || recibioCambioEnVivo || error || !data) return

            setEstadoCompetencia(data)
            setTiempoLocal(data.tiempo_restante ?? 60)
            corridoRef.current = data.corriendo
            if (data.corriendo) iniciarTimerLocal(data.tiempo_restante ?? 60)
            const fetchedAtletaId = data.atleta_id == null ? null : String(data.atleta_id)
            if (fetchedAtletaId && fetchedAtletaId !== lastPresentedAtletaId) solicitarPresentacion(data)
        }
        fetchEstado()

        // Autoritativo: reconcilia el estado real (puede llegar 300-700ms después)
        const channel = supabase
            .channel('public:estado_competencia_vista')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
                (payload) => aplicarEstado(payload.new, true)
            )
            .subscribe()

        // Fast-path: luces de jueces / atleta / cronómetro al instante (~50-150ms)
        const live = joinCompetenciaLive(
            (parcial) => aplicarEstado(parcial, false),
            null,
            solicitarPresentacion
        )

        return () => {
            activo = false
            supabase.removeChannel(channel)
            live.leave()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    const todosVotaron =
        estadoCompetencia?.juez1_valido !== null && estadoCompetencia?.juez1_valido !== undefined &&
        estadoCompetencia?.juez2_valido !== null && estadoCompetencia?.juez2_valido !== undefined &&
        estadoCompetencia?.juez3_valido !== null && estadoCompetencia?.juez3_valido !== undefined

    // Cada solicitud se muestra de inmediato con los datos del estado. La
    // consulta solo la enriquece: una ficha incompleta o un error de red nunca
    // pueden impedir la presentación.
    useEffect(() => {
        if (!solicitudPresentacion) return
        const {
            atletaId, atletaNombre, atletaApellido, atletaFoto,
            equipoNombre, equipoColor, equipoFoto, coachNombre, coachFoto,
            fichaCompleta, clave,
        } = solicitudPresentacion
        const requestSeq = ++presentFetchSeqRef.current

        let cancelado = false
        clearTimeout(presentTimerRef.current)
        cancelAnimationFrame(presentFrameRef.current)
        setMostrarPresentacion(false)
        setPresentacion({
            clave,
            atletaNombre: `${atletaNombre ?? ''} ${atletaApellido ?? ''}`.trim() || 'ATLETA',
            atletaFoto: atletaFoto || null,
            equipoNombre: equipoNombre || null,
            equipoColor: equipoColor || '#FFA500',
            equipoFoto: equipoFoto || null,
            coachNombre: coachNombre || null,
            coachFoto: coachFoto || null,
        })

        // Dos frames garantizan que el navegador pinte el estado inicial antes
        // de activar la transición, incluso en selecciones consecutivas.
        presentFrameRef.current = requestAnimationFrame(() => {
            presentFrameRef.current = requestAnimationFrame(() => {
                if (cancelado) return
                setMostrarPresentacion(true)
                presentTimerRef.current = setTimeout(() => setMostrarPresentacion(false), 6000)
            })
        })

        if (!fichaCompleta) {
            ;(async () => {
                try {
                    const rows = await fetchAtletasConIntentos({ atletaId })
                    const a = rows?.[0]
                    if (cancelado || requestSeq !== presentFetchSeqRef.current || !a) return
                    setPresentacion(prev => prev?.clave === clave ? {
                        ...prev,
                        atletaNombre: `${a.nombre ?? ''} ${a.apellido ?? ''}`.trim() || prev.atletaNombre,
                        atletaFoto: a.foto || null,
                        equipoNombre: a.equipo_nombre || null,
                        equipoColor: a.equipo_color || '#FFA500',
                        equipoFoto: a.equipo_foto || null,
                        coachNombre: a.equipo_coach_nombre || null,
                        coachFoto: a.equipo_coach_foto || null,
                    } : prev)
                } catch (err) {
                    console.error('Error al cargar presentación de equipo:', err)
                }
            })()
        }
        return () => {
            cancelado = true
            clearTimeout(presentTimerRef.current)
            cancelAnimationFrame(presentFrameRef.current)
        }
    }, [solicitudPresentacion])

    useEffect(() => () => {
        clearTimeout(presentTimerRef.current)
        cancelAnimationFrame(presentFrameRef.current)
    }, [])

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

            <Paper elevation={0} sx={{ display: 'flex', maxHeight: '760px', backgroundColor: '#000', color: 'white', border: 'none', boxShadow: 'none' }}>
                <Box sx={{ display: 'flex', gap: 3, flexDirection: 'row', width: '100%', height: '60vh', ml: 'auto', alignItems: 'center' }}>
                    <Paper elevation={8} className='aspect-square flex justify-center' sx={{
                        backgroundColor: 'transparent', height: '100%', width: '100%',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        borderRadius: 2, gap: 4,
                    }}>
                        <div className="flex justify-center items-stretch w-full gap-15" style={{ height: '100%' }}>
                            {[1, 2, 3].map((num) => {
                                const valor = estadoCompetencia[`juez${num}_valido`]
                                const tipo = estadoCompetencia[`juez${num}_tipo`]
                                const haVotado = valor !== null && valor !== undefined

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
                                    if (tipo === 1) { colorTipo = '#ff1744'; labelTipo = 'Rojo' }
                                    else if (tipo === 2) { colorTipo = '#1565c0'; labelTipo = 'Técnico' }
                                    else if (tipo === 3) { colorTipo = '#FFD600'; labelTipo = 'Equipo' }
                                }

                                return (
                                    <div key={num} className="flex flex-col items-center justify-between gap-3" style={{ width: '33%', height: '100%', paddingTop: '20px', paddingBottom: '20px' }}>
                                        {/* El indicador revela el resultado sólo cuando votaron todos. */}
                                        <div style={{ height: '34px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {haVotado && (
                                                <div style={{
                                                    width: '26px', height: '26px', borderRadius: '50%',
                                                    backgroundColor: todosVotaron && valor === false ? '#ff1744' : '#fff',
                                                    boxShadow: todosVotaron && valor === false
                                                        ? '0 0 14px 4px rgba(255,23,68,0.7)'
                                                        : '0 0 14px 4px rgba(255,255,255,0.7)',
                                                }} />
                                            )}
                                        </div>
                                        {/* Luz: se dimensiona por el alto disponible para no desbordar */}
                                        <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                                            <div
                                                className={`rounded-full transition-all duration-300 ${sombra}`}
                                                style={{ backgroundColor: colorPrincipal, height: '100%', maxHeight: '100%', maxWidth: '100%', aspectRatio: '1' }}
                                            />
                                        </div>
                                        {colorTipo ? (
                                            <div style={{
                                                flexShrink: 0,
                                                backgroundColor: colorTipo,
                                                borderRadius: '10px',
                                                width: '28%',
                                                height: '48px',
                                                boxShadow: `0 0 16px 5px ${colorTipo}99`,
                                            }} />
                                        ) : (
                                            <div style={{ height: '48px', flexShrink: 0 }} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </Paper>
                </Box>
            </Paper>

            {/* Presentación animada del equipo + coach */}
            {presentacion && (
                <Box key={presentacion.clave} sx={{
                    position: 'fixed', inset: 0, zIndex: 150,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5vh',
                    background: `radial-gradient(circle at 50% 38%, ${presentacion.equipoColor}55 0%, #000 65%)`,
                    backgroundColor: '#000',
                    opacity: mostrarPresentacion ? 1 : 0,
                    pointerEvents: 'none',
                    transition: 'opacity 0.5s ease',
                }}>
                    <Box sx={{
                        transform: mostrarPresentacion ? 'scale(1)' : 'scale(0.4)',
                        opacity: mostrarPresentacion ? 1 : 0,
                        transition: 'transform 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.15s, opacity 0.5s ease 0.15s',
                    }}>
                        <Avatar src={presentacion.atletaFoto || undefined} sx={{
                            width: '44vh', height: '44vh', bgcolor: presentacion.equipoColor,
                            boxShadow: `0 0 100px 20px ${presentacion.equipoColor}88`,
                        }}>
                            <PersonIcon color="#fff" style={{ width: '22vh', height: '22vh' }} />
                        </Avatar>
                    </Box>

                    <Typography sx={{
                        color: '#fff', fontWeight: 900, fontSize: '13vh', letterSpacing: 6, textAlign: 'center', lineHeight: 1,
                        textShadow: `0 0 60px ${presentacion.equipoColor}aa`,
                        opacity: mostrarPresentacion ? 1 : 0,
                        transform: mostrarPresentacion ? 'translateY(0)' : 'translateY(40px)',
                        transition: 'all 0.55s ease 0.3s',
                    }}>
                        {presentacion.atletaNombre?.toUpperCase()}
                    </Typography>

                    {(presentacion.equipoNombre || presentacion.coachNombre) && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6vh', flexWrap: 'wrap',
                            opacity: mostrarPresentacion ? 1 : 0,
                            transform: mostrarPresentacion ? 'translateY(0)' : 'translateY(40px)',
                            transition: 'all 0.55s ease 0.45s',
                        }}>
                            {presentacion.equipoNombre && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3vh' }}>
                                    <Avatar src={presentacion.equipoFoto || undefined} sx={{
                                        width: '17vh', height: '17vh', bgcolor: presentacion.equipoColor,
                                    }}>
                                        <GroupsIcon color="#fff" style={{ width: '8.5vh', height: '8.5vh' }} />
                                    </Avatar>
                                    <Box sx={{ textAlign: 'left' }}>
                                        <Typography sx={{ color: presentacion.equipoColor, letterSpacing: 10, fontWeight: 700, fontSize: '2.4rem', lineHeight: 1 }}>
                                            EQUIPO
                                        </Typography>
                                        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '6.5vh', lineHeight: 1.1 }}>
                                            {presentacion.equipoNombre.trim().toUpperCase()}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {presentacion.coachNombre && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3vh' }}>
                                    <Avatar src={presentacion.coachFoto || undefined} sx={{
                                        width: '17vh', height: '17vh', bgcolor: '#222',
                                    }}>
                                        <PersonIcon color="#fff" style={{ width: '8.5vh', height: '8.5vh' }} />
                                    </Avatar>
                                    <Box sx={{ textAlign: 'left' }}>
                                        <Typography sx={{ color: presentacion.equipoColor, letterSpacing: 10, fontWeight: 700, fontSize: '2.4rem', lineHeight: 1 }}>
                                            COACH
                                        </Typography>
                                        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '6.5vh', lineHeight: 1.1 }}>
                                            {presentacion.coachNombre.trim().toUpperCase()}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}
