'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Box, Typography, Paper, FormControl, InputLabel,
  Select, MenuItem, useMediaQuery, useTheme,
  Button, Stack, CircularProgress, Divider, Chip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import CheckIcon from '@mui/icons-material/Check'
import BlockIcon from '@mui/icons-material/Block'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { toast } from 'react-toastify'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { supabase } from '../../../lib/supabaseClient'
import { capitalizeWords } from '../../../utils/textUtils'
import { useDarkMode } from '../../../context/ThemeContext'
import categorias from '../../../const/categorias/categorias'

export default function CargadoresPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { isDark } = useDarkMode()

  const surface = isDark ? '#1a1a1a' : '#ffffff'
  const border  = isDark ? '#2a2a2a' : '#e0e0e0'

  const [atletas, setAtletas] = useState([])
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null)
  const [ejercicioFiltro, setEjercicioFiltro] = useState('sentadilla')
  const [tandaFiltro, setTandaFiltro] = useState(1)
  const [pesoFiltro, setPesoFiltro] = useState('todos')
  const [intentoSeleccionado, setIntentoSeleccionado] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [estadoJueces, setEstadoJueces] = useState(null)
  const [sortModel, setSortModel] = useState([])
  const [atletasOrdenados, setAtletasOrdenados] = useState([])
  const timerRef = useRef(null)
  const autoMarcadoRef = useRef(false)
  const prevAtletaIdRef = useRef(null)

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=${tandaFiltro}`
      )
      const data = await res.json()
      setAtletas(data)
      setAtletasOrdenados(data)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAtletas() }, [tandaFiltro])

  useEffect(() => {
    if (sortModel.length === 0) {
      setAtletasOrdenados(atletas)
      console.log('📋 Orden de atletas (sin ordenar):', atletas.map(a => `${a.apellido} (ID: ${a.id})`))
      return
    }

    const sorted = [...atletas].sort((a, b) => {
      const { field, sort } = sortModel[0]
      let fieldA, fieldB

      if (field === 'intento1') {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        fieldA = a[`primer_intento_${ek}`]
        fieldB = b[`primer_intento_${ek}`]
      } else if (field === 'intento2') {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        fieldA = a[`segundo_intento_${ek}`]
        fieldB = b[`segundo_intento_${ek}`]
      } else if (field === 'intento3') {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        fieldA = a[`tercer_intento_${ek}`]
        fieldB = b[`tercer_intento_${ek}`]
      } else {
        fieldA = a[field]
        fieldB = b[field]
      }

      const aValue = fieldA ?? -Infinity
      const bValue = fieldB ?? -Infinity
      if (aValue < bValue) return sort === 'asc' ? -1 : 1
      if (aValue > bValue) return sort === 'asc' ? 1 : -1
      return 0
    })

    setAtletasOrdenados(sorted)
    console.log('📋 Orden de atletas actualizado:', {
      columna: sortModel[0].field,
      direccion: sortModel[0].sort,
      atletas: sorted.map((a, idx) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        let valor = ''
        if (sortModel[0].field === 'intento1') valor = a[`primer_intento_${ek}`] || 'N/A'
        else if (sortModel[0].field === 'intento2') valor = a[`segundo_intento_${ek}`] || 'N/A'
        else if (sortModel[0].field === 'intento3') valor = a[`tercer_intento_${ek}`] || 'N/A'
        else valor = a[sortModel[0].field] || 'N/A'
        return `${idx}: "${a.apellido} (${valor})"`
      })
    })
  }, [sortModel, atletas, ejercicioFiltro])

  useEffect(() => {
    const fetchEstadoInicial = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces`)
      const data = await res.json()
      setEstadoJueces(data)
    }
    fetchEstadoInicial()

    const channel = supabase
      .channel('public:estado_competencia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        (payload) => { console.log('Cambio detectado:', payload); setEstadoJueces(payload.new) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    if (estadoJueces?.corriendo) {
      let segundos = estadoJueces.tiempo_restante ?? 60
      timerRef.current = setInterval(async () => {
        segundos -= 1
        setEstadoJueces(prev => prev ? { ...prev, tiempo_restante: segundos } : prev)
        if (segundos <= 0) {
          clearInterval(timerRef.current)
          timerRef.current = null
          await supabase.from('estado_competencia')
            .update({ corriendo: false, tiempo_restante: 0, updated_at: new Date() })
            .eq('id', 1)
        }
      }, 1000)
    }

    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [estadoJueces?.corriendo])

  // Auto-marcar intento cuando todos los jueces votan
  useEffect(() => {
    if (!estadoJueces) return

    // Resetear guard si cambia el atleta en curso
    if (estadoJueces.atleta_id !== prevAtletaIdRef.current) {
      prevAtletaIdRef.current = estadoJueces.atleta_id
      autoMarcadoRef.current = false
    }

    const todosVotaron =
      estadoJueces.juez1_valido !== null && estadoJueces.juez1_valido !== undefined &&
      estadoJueces.juez2_valido !== null && estadoJueces.juez2_valido !== undefined &&
      estadoJueces.juez3_valido !== null && estadoJueces.juez3_valido !== undefined

    if (!todosVotaron) { autoMarcadoRef.current = false; return }
    if (autoMarcadoRef.current) return

    autoMarcadoRef.current = true

    const votosValidos = [estadoJueces.juez1_valido, estadoJueces.juez2_valido, estadoJueces.juez3_valido]
      .filter(v => v === true).length

    marcarIntento(votosValidos >= 2)
  }, [estadoJueces])

  const iniciarCronometro = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces/start`, { method: 'POST' })
    } catch (err) { console.error('Error al iniciar cronómetro:', err) }
  }

  const detenerCronometro = async () => {
    await supabase.from('estado_competencia')
      .update({ corriendo: false, updated_at: new Date() })
      .eq('id', 1)
  }

  const marcarIntento = async (valido) => {
    if (!atletaSeleccionado) { toast.warning('Selecciona un atleta primero'); return }
    try {
      const movimientoMap = { 'sentadilla': 1, 'banco': 2, 'peso_muerto': 3 }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaSeleccionado.id,
          movimiento_id: movimientoMap[ejercicioFiltro],
          intento_numero: intentoSeleccionado,
          peso: pesoActual,
          valido,
        })
      })
      await detenerCronometro()
      await fetchAtletas()
      if (valido) toast.success('Intento VÁLIDO registrado')
      else toast.error('Intento NULO registrado')
    } catch (err) { console.error('Error al marcar intento:', err); toast.error('Error al registrar el intento') }
  }

  const restablecerIntento = async () => {
    if (!atletaSeleccionado) { toast.warning('Selecciona un atleta primero'); return }
    try {
      const movimientoMap = { 'sentadilla': 1, 'banco': 2, 'peso_muerto': 3 }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaSeleccionado.id,
          movimiento_id: movimientoMap[ejercicioFiltro],
          intento_numero: intentoSeleccionado,
          peso: null,
          valido: null,
        })
      })
      await fetchAtletas()
      toast.info('Intento restablecido')
    } catch (err) { console.error('Error al restablecer intento:', err); toast.error('Error al restablecer el intento') }
  }

  const calcularDiscos = (pesoTotal) => {
    if (!pesoTotal) return { discos: [], total: 0 }
    const pesoBarra = 20
    const pesoTopes = 5
    const pesoPorLado = (pesoTotal - pesoBarra - pesoTopes) / 2
    if (pesoPorLado <= 0) return { discos: [], total: pesoTotal }
    const discosDisponibles = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25]
    let pesoRestante = pesoPorLado
    const discosUsados = []
    for (const disco of discosDisponibles) {
      while (pesoRestante >= disco - 0.01) { discosUsados.push(disco); pesoRestante -= disco }
    }
    return { discos: discosUsados, total: pesoTotal }
  }

  const obtenerPesoSegunEjercicio = (atleta, ejercicio, numeroIntento = 1) => {
    if (!atleta) return 0
    const ek = ejercicio === 'sentadilla' ? 'sentadilla' : ejercicio === 'banco' ? 'banco' : 'peso_muerto'
    if (numeroIntento === 1) return atleta[`primer_intento_${ek}`] || 0
    if (numeroIntento === 2) return atleta[`segundo_intento_${ek}`] || 0
    if (numeroIntento === 3) return atleta[`tercer_intento_${ek}`] || 0
    return 0
  }

  const obtenerValidoSegunEjercicio = (atleta, ejercicio, numeroIntento = 1) => {
    if (!atleta) return null
    const mapeoValido = {
      'sentadilla': ['valido_s1', 'valido_s2', 'valido_s3'],
      'banco': ['valido_b1', 'valido_b2', 'valido_b3'],
      'peso_muerto': ['valido_d1', 'valido_d2', 'valido_d3'],
    }
    const campos = mapeoValido[ejercicio]
    if (!campos) return null
    return atleta[campos[numeroIntento - 1]]
  }

  const getMejorIntento = (atleta, ejercicio) => {
    if (!atleta) return null
    const intentos = [1, 2, 3].map(n => ({
      peso: obtenerPesoSegunEjercicio(atleta, ejercicio, n),
      valido: obtenerValidoSegunEjercicio(atleta, ejercicio, n),
      numero: n,
    }))
    const intentosValidos = intentos.filter(i => i.peso && i.valido === true)
    if (intentosValidos.length === 0) return null
    return intentosValidos.reduce((max, cur) => cur.peso > max.peso ? cur : max).numero
  }

  const handleCellClick = async (params) => {
    let intento = 1
    if (params.field === 'intento1') intento = 1
    else if (params.field === 'intento2') intento = 2
    else if (params.field === 'intento3') intento = 3

    const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
    let peso = 0
    if (intento === 1) peso = params.row[`primer_intento_${ek}`] || 0
    else if (intento === 2) peso = params.row[`segundo_intento_${ek}`] || 0
    else if (intento === 3) peso = params.row[`tercer_intento_${ek}`] || 0

    if (!peso) return

    setAtletaSeleccionado(params.row)
    setIntentoSeleccionado(intento)

    const atletasVista = pesoFiltro === 'todos' ? atletasOrdenados : atletasOrdenados.filter(a => a.categoria === pesoFiltro)
    const indiceActual = atletasVista.findIndex(a => a.id === params.row.id)
    const ordenProximos = indiceActual !== -1 ? atletasVista.slice(indiceActual + 1).map(a => a.id) : []

    console.log('🎯 ========== ATLETA SELECCIONADO ==========')
    console.log('Atleta:', params.row.apellido, params.row.nombre)
    console.log('ID:', params.row.id)
    console.log('Índice en tabla ordenada:', indiceActual)
    console.log('Total de atletas en la tabla:', atletasVista.length)
    console.log('Atletas que siguen (total):', ordenProximos.length)
    console.log('Próximos atletas:', atletasVista.slice(indiceActual + 1).map(a => `${a.apellido} (ID: ${a.id})`))
    console.log('IDs enviados al backend:', ordenProximos)
    console.log('==========================================')

    const { error } = await supabase.from('estado_competencia').update({
      atleta_id: params.row.id,
      atleta_nombre: params.row.nombre,
      atleta_apellido: params.row.apellido,
      ejercicio: ejercicioFiltro,
      intento,
      peso,
      corriendo: false,
      tiempo_restante: 60,
      juez1_valido: null, juez2_valido: null, juez3_valido: null,
      juez1_tipo: null, juez2_tipo: null, juez3_tipo: null,
      intento_valido: null,
      orden_proximos: ordenProximos,
      updated_at: new Date(),
    }).eq('id', 1)

    if (error) console.error('Error al actualizar atleta actual:', error)
  }

  const processRowUpdate = async (newRow, oldRow) => {
    try {
      const movimientoMap = { 'sentadilla': 1, 'banco': 2, 'peso_muerto': 3 }
      const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
      const campo1 = `primer_intento_${ek}`
      const campo2 = `segundo_intento_${ek}`
      const campo3 = `tercer_intento_${ek}`
      const cambios = []
      if (newRow[campo1] !== oldRow[campo1] && newRow[campo1] != null && newRow[campo1] !== '')
        cambios.push({ atleta_id: newRow.id, movimiento_id: movimientoMap[ejercicioFiltro], intento_numero: 1, peso: parseFloat(newRow[campo1]), valido: null })
      if (newRow[campo2] !== oldRow[campo2] && newRow[campo2] != null && newRow[campo2] !== '')
        cambios.push({ atleta_id: newRow.id, movimiento_id: movimientoMap[ejercicioFiltro], intento_numero: 2, peso: parseFloat(newRow[campo2]), valido: null })
      if (newRow[campo3] !== oldRow[campo3] && newRow[campo3] != null && newRow[campo3] !== '')
        cambios.push({ atleta_id: newRow.id, movimiento_id: movimientoMap[ejercicioFiltro], intento_numero: 3, peso: parseFloat(newRow[campo3]), valido: null })

      if (cambios.length > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intentos: cambios })
        })
      }
      await fetchAtletas()
      return newRow
    } catch (err) { console.error('Error al actualizar peso:', err); return oldRow }
  }

  const handleProcessRowUpdateError = (error) => { console.error('Error al procesar actualización:', error) }

  const columns = [
    {
      field: 'apellido', headerName: 'Apellido', flex: 0.06, minWidth: 100,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => capitalizeWords(params.value),
    },
    {
      field: 'categoria', headerName: 'Categoría', flex: 0.04,
      align: 'center', headerAlign: 'center',
    },
    {
      field: 'intento1', headerName: '1°', flex: 0.06, minWidth: 80,
      align: 'center', headerAlign: 'center', editable: true, type: 'number',
      valueGetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`primer_intento_${ek}`] || null
      },
      valueSetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`primer_intento_${ek}`]: value }
      },
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 1)
        const valido = obtenerValidoSegunEjercicio(params.row, ejercicioFiltro, 1)
        const esMejor = getMejorIntento(params.row, ejercicioFiltro) === 1
        if (!peso && peso !== 0) return <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</Box>
        return (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, bgcolor: esMejor ? '#fff3e0' : 'transparent', borderRadius: 1, fontWeight: esMejor ? 'bold' : 'normal', color: esMejor ? '#e65100' : 'inherit' }}>
            <span>{peso} kg</span>
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
            {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
          </Box>
        )
      },
    },
    {
      field: 'intento2', headerName: '2°', flex: 0.06, minWidth: 80,
      align: 'center', headerAlign: 'center', editable: true, type: 'number',
      valueGetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`segundo_intento_${ek}`] || null
      },
      valueSetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`segundo_intento_${ek}`]: value }
      },
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 2)
        const valido = obtenerValidoSegunEjercicio(params.row, ejercicioFiltro, 2)
        const esMejor = getMejorIntento(params.row, ejercicioFiltro) === 2
        if (!peso && peso !== 0) return <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</Box>
        return (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, bgcolor: esMejor ? '#fff3e0' : 'transparent', borderRadius: 1, fontWeight: esMejor ? 'bold' : 'normal', color: esMejor ? '#e65100' : 'inherit' }}>
            <span>{peso} kg</span>
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
            {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
          </Box>
        )
      },
    },
    {
      field: 'intento3', headerName: '3°', flex: 0.06, minWidth: 80,
      align: 'center', headerAlign: 'center', editable: true, type: 'number',
      valueGetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`tercer_intento_${ek}`] || null
      },
      valueSetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`tercer_intento_${ek}`]: value }
      },
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 3)
        const valido = obtenerValidoSegunEjercicio(params.row, ejercicioFiltro, 3)
        const esMejor = getMejorIntento(params.row, ejercicioFiltro) === 3
        if (!peso && peso !== 0) return <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</Box>
        return (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, bgcolor: esMejor ? '#fff3e0' : 'transparent', borderRadius: 1, fontWeight: esMejor ? 'bold' : 'normal', color: esMejor ? '#e65100' : 'inherit' }}>
            <span>{peso} kg</span>
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
            {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
          </Box>
        )
      },
    },
  ]

  const pesoActual = atletaSeleccionado
    ? obtenerPesoSegunEjercicio(atletaSeleccionado, ejercicioFiltro, intentoSeleccionado)
    : 0
  const { discos } = calcularDiscos(pesoActual)

  const ejercicioLabel = { sentadilla: 'Sentadilla', banco: 'Banco', peso_muerto: 'Peso Muerto' }[ejercicioFiltro]
  const ejercicioColor = { sentadilla: '#1976d2', banco: '#d32f2f', peso_muerto: '#388e3c' }[ejercicioFiltro]

  const todasLasCategorias = [...categorias.M, ...categorias.F]
  const atletasMostrados = pesoFiltro === 'todos'
    ? atletasOrdenados
    : atletasOrdenados.filter(a => a.categoria === pesoFiltro)

  const todosVotaron =
    estadoJueces?.juez1_valido !== null && estadoJueces?.juez1_valido !== undefined &&
    estadoJueces?.juez2_valido !== null && estadoJueces?.juez2_valido !== undefined &&
    estadoJueces?.juez3_valido !== null && estadoJueces?.juez3_valido !== undefined

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>Cargadores</Typography>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
            <Chip label={ejercicioLabel} size="small" sx={{ bgcolor: ejercicioColor, color: '#fff', fontWeight: 700, fontSize: '0.75rem' }} />
            <Chip label={`Tanda ${tandaFiltro}`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
            {pesoFiltro !== 'todos' && (
              <Chip label={pesoFiltro} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
            )}
          </Stack>
        </Box>
      </Stack>

      {/* Atleta seleccionado */}
      {atletaSeleccionado && (
        <Box sx={{
          px: 3, py: 1.5, borderRadius: 2,
          background: `linear-gradient(135deg, #ff6b35, #ff9a00)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
        }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>
            {capitalizeWords(atletaSeleccionado.nombre)} {capitalizeWords(atletaSeleccionado.apellido)}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={atletaSeleccionado.categoria} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700 }} />
            <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
              {pesoActual} kg — Intento {intentoSeleccionado}°
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Cuerpo principal */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>

        {/* Tabla izquierda */}
        <Paper
          elevation={0}
          sx={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            border: `1px solid ${border}`, borderRadius: 3, overflow: 'hidden',
            backgroundColor: surface,
          }}
        >
          {/* Filtros */}
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Select
              size="small"
              value={ejercicioFiltro}
              onChange={(e) => setEjercicioFiltro(e.target.value)}
              sx={{ minWidth: 140, borderRadius: 2 }}
            >
              <MenuItem value="sentadilla">Sentadilla</MenuItem>
              <MenuItem value="banco">Banco</MenuItem>
              <MenuItem value="peso_muerto">Peso Muerto</MenuItem>
            </Select>
            <Select
              size="small"
              value={tandaFiltro}
              onChange={(e) => setTandaFiltro(e.target.value)}
              sx={{ minWidth: 120, borderRadius: 2 }}
            >
              <MenuItem value={1}>Tanda 1</MenuItem>
              <MenuItem value={2}>Tanda 2</MenuItem>
              <MenuItem value={3}>Tanda 3</MenuItem>
              <MenuItem value={4}>Tanda 4</MenuItem>
            </Select>
            <Select
              size="small"
              value={pesoFiltro}
              onChange={(e) => setPesoFiltro(e.target.value)}
              sx={{ minWidth: 130, borderRadius: 2 }}
            >
              <MenuItem value="todos">Todas las categorías</MenuItem>
              {todasLasCategorias.map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </Box>

          <Divider sx={{ borderColor: border }} />

          <Box sx={{ flex: 1, minHeight: 0 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={40} sx={{ color: '#FF9800' }} />
              </Box>
            ) : (
              <GenericDataGrid
                rows={atletasMostrados}
                columns={columns}
                paginationMode="client"
                loading={isLoading}
                sortModel={sortModel}
                onSortModelChange={(m) => setSortModel(m)}
                onCellClick={handleCellClick}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={handleProcessRowUpdateError}
                columnVisibilityModel={{ nombre: !isMobile, tanda_id: !isMobile, categoria: !isMobile }}
              />
            )}
          </Box>
        </Paper>

        {/* Panel de discos derecha */}
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', md: '52vw' }, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            border: `1px solid ${border}`, borderRadius: 3, overflow: 'hidden',
            backgroundColor: surface,
          }}
        >
          {atletaSeleccionado ? (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, gap: 2, position: 'relative' }}>

              {/* Altura del rack */}
              {(ejercicioFiltro === 'sentadilla' || ejercicioFiltro === 'banco') && (
                <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Stack direction="row" alignItems="baseline" gap={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Rack
                    </Typography>
                    <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, color: ejercicioColor }}>
                      {ejercicioFiltro === 'sentadilla'
                        ? (atletaSeleccionado.altura_rack_sentadilla || '—')
                        : (atletaSeleccionado.altura_rack_banco || '—')}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Peso total destacado */}
              {pesoActual > 0 && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, color: ejercicioColor }}>
                    {pesoActual}
                    <Typography component="span" sx={{ fontSize: '2.5rem', fontWeight: 700, ml: 1, color: 'text.secondary' }}>kg</Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Barra 20 kg + Topes 5 kg
                  </Typography>
                </Box>
              )}

              {/* Discos */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pesoActual > 0 ? (
                  discos.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                      {Object.entries(
                        discos.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc }, {})
                      )
                        .sort((a, b) => b[0] - a[0])
                        .map(([peso, cantidad]) => {
                          const p = parseFloat(peso)
                          const getAltura = (p) => {
                            if (p >= 25) return '130px'
                            if (p >= 20) return '120px'
                            if (p >= 15) return '110px'
                            if (p >= 10) return '105px'
                            if (p >= 5)  return '95px'
                            if (p >= 2.5) return '85px'
                            if (p >= 1.25) return '78px'
                            return '70px'
                          }
                          const tiposDeDiscos = Object.keys(discos.reduce((acc, d) => { acc[d] = true; return acc }, {})).length
                          const ancho = tiposDeDiscos > 3 ? '10vw' : '13vw'

                          const textColor = p == 15 || p == 5 || p == 1.25 || p == 0.5 || p == 0.25 ? '#000' : '#fff'
                          const bgColor = p == 25 ? '#f44336' : p == 20 ? '#2196f3' : p == 15 ? '#ffeb3b' : p == 10 ? '#4caf50' : p == 5 ? '#fff' : p == 2.5 ? '#000' : p == 1.25 ? '#C0C0C0' : '#9e9e9e'

                          return (
                            <Box key={peso} sx={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 2, px: '18px', py: getAltura(p),
                              width: ancho, fontWeight: 'bold', color: textColor,
                              backgroundColor: bgColor,
                              border: p == 5 ? '2px solid #d0d0d0' : 'none',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1, fontSize: '4.5rem', fontWeight: 900 }}>
                                <div>{peso}</div>
                                <div style={{ fontSize: '2.8rem', opacity: 0.8 }}>×</div>
                                <div>{cantidad}</div>
                              </Box>
                            </Box>
                          )
                        })}

                      {/* Tope */}
                      <Box sx={{ borderRadius: 1, width: '32px', height: '200px', backgroundColor: '#9e9e9e', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <FitnessCenterIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="h4" color="text.secondary">Solo barra (20 kg)</Typography>
                    </Box>
                  )
                ) : (
                  <Typography variant="body1" color="error" textAlign="center" fontWeight={600}>
                    Este intento no tiene peso asignado
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Controles */}
              <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" flexWrap="wrap">
                {/* Play / Pause */}
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={iniciarCronometro} disabled={estadoJueces?.corriendo}
                    sx={{ width: 68, height: 68, bgcolor: '#ff6b35', '&:hover': { bgcolor: '#e55a27' }, borderRadius: 2 }}>
                    <PlayArrowIcon sx={{ fontSize: 40 }} />
                  </Button>
                  <Button variant="contained" color="error" onClick={detenerCronometro} disabled={!estadoJueces?.corriendo}
                    sx={{ width: 68, height: 68, borderRadius: 2 }}>
                    <PauseIcon sx={{ fontSize: 40 }} />
                  </Button>
                </Stack>

                {/* Jueces */}
                <Stack direction="row" spacing={1.5}>
                  {[estadoJueces?.juez1_valido, estadoJueces?.juez2_valido, estadoJueces?.juez3_valido].map((valido, i) => {
                    const color = !todosVotaron ? (isDark ? '#2e2e2e' : '#e0e0e0')
                      : valido === true ? '#00e676' : '#ff1744'
                    return (
                      <Box key={i} sx={{
                        width: 68, height: 68, borderRadius: 2,
                        backgroundColor: color,
                        boxShadow: !todosVotaron ? 'none'
                          : valido === true ? '0 0 20px 4px rgba(0,230,118,0.5)' : '0 0 20px 4px rgba(255,23,68,0.5)',
                        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                      }} />
                    )
                  })}
                </Stack>

                {/* Válido / Nulo / Restablecer */}
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={() => marcarIntento(true)}
                    disabled={!atletaSeleccionado || !pesoActual}
                    sx={{ width: 68, height: 68, bgcolor: '#00e676', '&:hover': { bgcolor: '#00c853' }, borderRadius: 2 }}>
                    <CheckIcon sx={{ fontSize: 40 }} />
                  </Button>
                  <Button variant="contained" onClick={() => marcarIntento(false)}
                    disabled={!atletaSeleccionado || !pesoActual}
                    sx={{ width: 68, height: 68, bgcolor: '#ff1744', '&:hover': { bgcolor: '#d50000' }, borderRadius: 2 }}>
                    <BlockIcon sx={{ fontSize: 40 }} />
                  </Button>
                  <Button variant="contained" onClick={restablecerIntento}
                    disabled={!atletaSeleccionado}
                    sx={{ width: 68, height: 68, bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, borderRadius: 2 }}>
                    <RestartAltIcon sx={{ fontSize: 40 }} />
                  </Button>
                </Stack>
              </Stack>

              {(!atletaSeleccionado || !pesoActual) && (
                <Typography variant="caption" color="error" textAlign="center">
                  Selecciona un atleta e intento para marcar el resultado
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}>
              <FitnessCenterIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
              <Typography variant="h6" color="text.secondary" textAlign="center">
                Selecciona un atleta de la tabla para ver los discos
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
