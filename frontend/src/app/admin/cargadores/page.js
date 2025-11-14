'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Button,
  Stack,
  CircularProgress
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { toast } from 'react-toastify'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { supabase } from '../../../lib/supabaseClient'
import { capitalizeWords } from '../../../utils/textUtils'

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export default function CargadoresPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [atletas, setAtletas] = useState([])
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null)
  const [ejercicioFiltro, setEjercicioFiltro] = useState('sentadilla')
  const [tandaFiltro, setTandaFiltro] = useState(1)
  const [intentoSeleccionado, setIntentoSeleccionado] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [estadoJueces, setEstadoJueces] = useState(null)
  const [sortModel, setSortModel] = useState([])
  const [atletasOrdenados, setAtletasOrdenados] = useState([])

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=${tandaFiltro}`
      )
      const data = await res.json()
      setAtletas(data)
      setAtletasOrdenados(data) // Inicialmente el orden es el del backend
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAtletas()
  }, [tandaFiltro])

  // Actualizar el orden cuando cambia el sortModel o los atletas
  useEffect(() => {
    if (sortModel.length === 0) {
      setAtletasOrdenados(atletas)
      console.log('📋 Orden de atletas (sin ordenar):', atletas.map(a => `${a.apellido} (ID: ${a.id})`))
      return
    }

    const sorted = [...atletas].sort((a, b) => {
      const { field, sort } = sortModel[0]

      // Mapear los campos de las columnas a los campos reales del ejercicio
      let fieldA, fieldB

      if (field === 'intento1') {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        fieldA = a[`primer_intento_${ejercicioKey}`]
        fieldB = b[`primer_intento_${ejercicioKey}`]
      } else if (field === 'intento2') {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        fieldA = a[`segundo_intento_${ejercicioKey}`]
        fieldB = b[`segundo_intento_${ejercicioKey}`]
      } else if (field === 'intento3') {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        fieldA = a[`tercer_intento_${ejercicioKey}`]
        fieldB = b[`tercer_intento_${ejercicioKey}`]
      } else {
        fieldA = a[field]
        fieldB = b[field]
      }

      // Manejar valores null/undefined (ponerlos al final)
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
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'

        let valor = ''
        if (sortModel[0].field === 'intento1') {
          valor = a[`primer_intento_${ejercicioKey}`] || 'N/A'
        } else if (sortModel[0].field === 'intento2') {
          valor = a[`segundo_intento_${ejercicioKey}`] || 'N/A'
        } else if (sortModel[0].field === 'intento3') {
          valor = a[`tercer_intento_${ejercicioKey}`] || 'N/A'
        } else {
          valor = a[sortModel[0].field] || 'N/A'
        }

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'estado_competencia',
          filter: 'id=eq.1',
        },
        (payload) => {
          console.log('Cambio detectado:', payload)
          setEstadoJueces(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const iniciarCronometro = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces/start`, { method: 'POST' })
    } catch (err) {
      console.error('Error al iniciar cronómetro:', err)
    }
  }

  const detenerCronometro = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces/stop`, { method: 'POST' })
    } catch (err) {
      console.error('Error al detener cronómetro:', err)
    }
  }

  const marcarIntento = async (valido) => {
    if (!atletaSeleccionado) {
      toast.warning('Selecciona un atleta primero')
      return
    }

    try {
      const movimientoMap = {
        'sentadilla': 1,
        'banco': 2,
        'peso_muerto': 3
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaSeleccionado.id,
          movimiento_id: movimientoMap[ejercicioFiltro],
          intento_numero: intentoSeleccionado,
          peso: pesoActual,
          valido: valido
        })
      })

      await detenerCronometro()
      await fetchAtletas()

      if (valido) {
        toast.success('Intento VÁLIDO registrado')
      } else {
        toast.error('Intento NULO registrado')
      }
    } catch (err) {
      console.error('Error al marcar intento:', err)
      toast.error('Error al registrar el intento')
    }
  }

  const restablecerIntento = async () => {
    if (!atletaSeleccionado) {
      toast.warning('Selecciona un atleta primero')
      return
    }

    try {
      const movimientoMap = {
        'sentadilla': 1,
        'banco': 2,
        'peso_muerto': 3
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaSeleccionado.id,
          movimiento_id: movimientoMap[ejercicioFiltro],
          intento_numero: intentoSeleccionado,
          peso: null,
          valido: null
        })
      })

      await fetchAtletas()
      toast.info('Intento restablecido')
    } catch (err) {
      console.error('Error al restablecer intento:', err)
      toast.error('Error al restablecer el intento')
    }
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
      while (pesoRestante >= disco - 0.01) {
        discosUsados.push(disco)
        pesoRestante -= disco
      }
    }

    return { discos: discosUsados, total: pesoTotal }
  }

  const obtenerPesoSegunEjercicio = (atleta, ejercicio, numeroIntento = 1) => {
    if (!atleta) return 0

    const ejercicioKey = ejercicio === 'sentadilla' ? 'sentadilla' :
      ejercicio === 'banco' ? 'banco' : 'peso_muerto'

    if (numeroIntento === 1) {
      return atleta[`primer_intento_${ejercicioKey}`] || 0
    } else if (numeroIntento === 2) {
      return atleta[`segundo_intento_${ejercicioKey}`] || 0
    } else if (numeroIntento === 3) {
      return atleta[`tercer_intento_${ejercicioKey}`] || 0
    }

    return 0
  }

  const obtenerValidoSegunEjercicio = (atleta, ejercicio, numeroIntento = 1) => {
    if (!atleta) return null

    const mapeoValido = {
      'sentadilla': ['valido_s1', 'valido_s2', 'valido_s3'],
      'banco': ['valido_b1', 'valido_b2', 'valido_b3'],
      'peso_muerto': ['valido_d1', 'valido_d2', 'valido_d3']
    }

    const campos = mapeoValido[ejercicio]
    if (!campos) return null

    return atleta[campos[numeroIntento - 1]]
  }

  const getMejorIntento = (atleta, ejercicio) => {
    if (!atleta) return null

    const intentos = [
      {
        peso: obtenerPesoSegunEjercicio(atleta, ejercicio, 1),
        valido: obtenerValidoSegunEjercicio(atleta, ejercicio, 1),
        numero: 1
      },
      {
        peso: obtenerPesoSegunEjercicio(atleta, ejercicio, 2),
        valido: obtenerValidoSegunEjercicio(atleta, ejercicio, 2),
        numero: 2
      },
      {
        peso: obtenerPesoSegunEjercicio(atleta, ejercicio, 3),
        valido: obtenerValidoSegunEjercicio(atleta, ejercicio, 3),
        numero: 3
      }
    ]

    const intentosValidos = intentos.filter(i => i.peso && i.valido === true)
    if (intentosValidos.length === 0) return null

    const mejor = intentosValidos.reduce((max, current) =>
      current.peso > max.peso ? current : max
    )

    return mejor.numero
  }

  const handleCellClick = async (params) => {
    setAtletaSeleccionado(params.row)

    let intento = 1
    if (params.field === 'intento1') {
      setIntentoSeleccionado(1)
      intento = 1
    } else if (params.field === 'intento2') {
      setIntentoSeleccionado(2)
      intento = 2
    } else if (params.field === 'intento3') {
      setIntentoSeleccionado(3)
      intento = 3
    }

    // Obtener el peso del intento seleccionado
    const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
      ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'

    let peso = 0
    if (intento === 1) {
      peso = params.row[`primer_intento_${ejercicioKey}`] || 0
    } else if (intento === 2) {
      peso = params.row[`segundo_intento_${ejercicioKey}`] || 0
    } else if (intento === 3) {
      peso = params.row[`tercer_intento_${ejercicioKey}`] || 0
    }

    // Obtener el índice del atleta seleccionado en el array ORDENADO VISUALMENTE
    const indiceActual = atletasOrdenados.findIndex(a => a.id === params.row.id)

    // Obtener los IDs de TODOS los atletas que están VISUALMENTE debajo
    const ordenProximos = indiceActual !== -1
      ? atletasOrdenados.slice(indiceActual + 1).map(a => a.id)
      : []

    console.log('🎯 ========== ATLETA SELECCIONADO ==========')
    console.log('Atleta:', params.row.apellido, params.row.nombre)
    console.log('ID:', params.row.id)
    console.log('Índice en tabla ordenada:', indiceActual)
    console.log('Total de atletas en la tabla:', atletasOrdenados.length)
    console.log('Atletas que siguen (total):', ordenProximos.length)
    console.log('Próximos atletas:', atletasOrdenados.slice(indiceActual + 1).map(a => `${a.apellido} (ID: ${a.id})`))
    console.log('IDs enviados al backend:', ordenProximos)
    console.log('==========================================')

    // Actualizar el atleta actual en el estado de competencia
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces/atleta-actual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: params.row.id,
          ejercicio: ejercicioFiltro,
          intento: intento,
          peso: peso,
          orden_proximos: ordenProximos
        })
      })
    } catch (err) {
      console.error('Error al actualizar atleta actual:', err)
    }
  }

  const processRowUpdate = async (newRow, oldRow) => {
    try {
      const movimientoMap = {
        'sentadilla': 1,
        'banco': 2,
        'peso_muerto': 3
      }

      const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
        ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'

      const campo1 = `primer_intento_${ejercicioKey}`
      const campo2 = `segundo_intento_${ejercicioKey}`
      const campo3 = `tercer_intento_${ejercicioKey}`

      if (newRow[campo1] !== oldRow[campo1] && newRow[campo1] != null && newRow[campo1] !== '') {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            atleta_id: newRow.id,
            movimiento_id: movimientoMap[ejercicioFiltro],
            intento_numero: 1,
            peso: parseFloat(newRow[campo1]),
            valido: null
          })
        })
      }

      if (newRow[campo2] !== oldRow[campo2] && newRow[campo2] != null && newRow[campo2] !== '') {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            atleta_id: newRow.id,
            movimiento_id: movimientoMap[ejercicioFiltro],
            intento_numero: 2,
            peso: parseFloat(newRow[campo2]),
            valido: null
          })
        })
      }

      if (newRow[campo3] !== oldRow[campo3] && newRow[campo3] != null && newRow[campo3] !== '') {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            atleta_id: newRow.id,
            movimiento_id: movimientoMap[ejercicioFiltro],
            intento_numero: 3,
            peso: parseFloat(newRow[campo3]),
            valido: null
          })
        })
      }

      await fetchAtletas()
      return newRow
    } catch (err) {
      console.error('Error al actualizar peso:', err)
      return oldRow
    }
  }

  const handleProcessRowUpdateError = (error) => {
    console.error('Error al procesar actualización:', error)
  }

  const columns = [
    {
      field: 'apellido',
      headerName: 'Apellido',
      flex: 0.06,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => capitalizeWords(params.value)
    },
    {
      field: 'categoria',
      headerName: 'Categoría',
      flex: 0.04,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'intento1',
      headerName: '1°',
      flex: 0.06,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      editable: true,
      type: 'number',
      valueGetter: (value, row) => {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`primer_intento_${ejercicioKey}`] || null
      },
      valueSetter: (value, row) => {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`primer_intento_${ejercicioKey}`]: value }
      },
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 1)
        const valido = obtenerValidoSegunEjercicio(params.row, ejercicioFiltro, 1)
        const mejorNumero = getMejorIntento(params.row, ejercicioFiltro)
        const esMejor = mejorNumero === 1

        if (!peso && peso !== 0) return (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            -
          </Box>
        )

        return (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            bgcolor: esMejor ? '#fff3e0' : 'transparent',
            borderRadius: 1,
            fontWeight: esMejor ? 'bold' : 'normal',
            color: esMejor ? '#e65100' : 'inherit',
          }}>
            <span>{peso} kg</span>
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
            {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
          </Box>
        )
      }
    },
    {
      field: 'intento2',
      headerName: '2°',
      flex: 0.06,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      editable: true,
      type: 'number',
      valueGetter: (value, row) => {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`segundo_intento_${ejercicioKey}`] || null
      },
      valueSetter: (value, row) => {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`segundo_intento_${ejercicioKey}`]: value }
      },
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 2)
        const valido = obtenerValidoSegunEjercicio(params.row, ejercicioFiltro, 2)
        const mejorNumero = getMejorIntento(params.row, ejercicioFiltro)
        const esMejor = mejorNumero === 2

        if (!peso && peso !== 0) return (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            -
          </Box>
        )

        return (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            bgcolor: esMejor ? '#fff3e0' : 'transparent',
            borderRadius: 1,
            fontWeight: esMejor ? 'bold' : 'normal',
            color: esMejor ? '#e65100' : 'inherit',
          }}>
            <span>{peso} kg</span>
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
            {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
          </Box>
        )
      }
    },
    {
      field: 'intento3',
      headerName: '3°',
      flex: 0.06,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      editable: true,
      type: 'number',
      valueGetter: (value, row) => {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`tercer_intento_${ejercicioKey}`] || null
      },
      valueSetter: (value, row) => {
        const ejercicioKey = ejercicioFiltro === 'sentadilla' ? 'sentadilla' :
          ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`tercer_intento_${ejercicioKey}`]: value }
      },
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 3)
        const valido = obtenerValidoSegunEjercicio(params.row, ejercicioFiltro, 3)
        const mejorNumero = getMejorIntento(params.row, ejercicioFiltro)
        const esMejor = mejorNumero === 3

        if (!peso && peso !== 0) return (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            -
          </Box>
        )

        return (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            bgcolor: esMejor ? '#fff3e0' : 'transparent',
            borderRadius: 1,
            fontWeight: esMejor ? 'bold' : 'normal',
            color: esMejor ? '#e65100' : 'inherit',
          }}>
            <span>{peso} kg</span>
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
            {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
          </Box>
        )
      }
    }
  ]

  const pesoActual = atletaSeleccionado
    ? obtenerPesoSegunEjercicio(atletaSeleccionado, ejercicioFiltro, intentoSeleccionado)
    : 0
  const { discos } = calcularDiscos(pesoActual)

  const obtenerColorEjercicio = (ejercicio) => {
    return '#ff6b35'
  }

  return (
    <Box sx={{ p: 4, minHeight: '100vh', mx: 'auto' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 3
      }}>
        <FormControl sx={{ minWidth: { xs: '100%', md: 200 } }}>
          <InputLabel>Ejercicio</InputLabel>
          <Select
            value={ejercicioFiltro}
            label="Ejercicio"
            onChange={(e) => setEjercicioFiltro(e.target.value)}
          >
            <MenuItem value="sentadilla">Sentadilla</MenuItem>
            <MenuItem value="banco">Banco</MenuItem>
            <MenuItem value="peso_muerto">Peso Muerto</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: { xs: '100%', md: 200 } }}>
          <InputLabel>Tanda</InputLabel>
          <Select
            value={tandaFiltro}
            label="Tanda"
            onChange={(e) => setTandaFiltro(e.target.value)}
          >
            <MenuItem value={1}>Tanda 1</MenuItem>
            <MenuItem value={2}>Tanda 2</MenuItem>
            <MenuItem value={3}>Tanda 3</MenuItem>
            <MenuItem value={4}>Tanda 4</MenuItem>
          </Select>
        </FormControl>

        {atletaSeleccionado && (
          <Box backgroundColor='#ff6b35 ' sx={{ p: 2, width: '100%', textAlign: 'center', borderRadius: 1 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
              {capitalizeWords(atletaSeleccionado.nombre)}  {capitalizeWords(atletaSeleccionado.apellido)} - {atletaSeleccionado.categoria} - Peso del tiro: {pesoActual} kg

            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', },
        gap: 2
      }}>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, width: '100%', height: { xs: 'auto', md: 'calc(100vh - 200px)' } }} >

          <Box sx={{ flex: { xs: 1, md: 1 }, order: { xs: 2, md: 1 }, height: '100%' }}>
            <Box sx={{
              width: '100%',
              height: '100%'
            }}>
              <GenericDataGrid
                rows={atletas}
                columns={columns}
                paginationMode="client"
                loading={isLoading}
                sortModel={sortModel}
                onSortModelChange={(newSortModel) => setSortModel(newSortModel)}
                onCellClick={handleCellClick}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={handleProcessRowUpdateError}
                columnVisibilityModel={{
                  nombre: !isMobile,
                  tanda_id: !isMobile,
                  categoria: !isMobile,
                }}
              />
            </Box>
          </Box>

          <Box sx={{
            width: { xs: '100%', md: '50vw' },
            order: { xs: 1, md: 2 },
            flexShrink: 0,
            height: '100%'
          }}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', overflow: 'auto' }}>
              {atletaSeleccionado ? (
                <>
                  {(ejercicioFiltro === 'sentadilla' || ejercicioFiltro === 'banco') && (
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        mb: 2,
                        backgroundColor: '#FFF3E0',
                        textAlign: 'center',
                        border: '2px solid #FF9800'
                      }}
                    >
                      <Typography variant="h5" fontWeight="bold" color="#FF9800">
                        Altura del Rack: {
                          ejercicioFiltro === 'sentadilla' 
                            ? (atletaSeleccionado.altura_rack_sentadilla || 'No configurada')
                            : (atletaSeleccionado.altura_rack_banco || 'No configurada')
                        }
                      </Typography>
                    </Paper>
                  )}

                  {pesoActual > 0 ? (
                    discos.length > 0 ? (
                      <>
                        <Box sx={{ position: 'relative', display: 'inline-block', py: 2 }}>
                          <Box
                            sx={{
                              py: 2,
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            {Object.entries(
                              discos.reduce((acc, disco) => {
                                acc[disco] = (acc[disco] || 0) + 1
                                return acc
                              }, {})
                            )
                              .sort((a, b) => b[0] - a[0])
                              .map(([peso, cantidad]) => {
                                // Calcular altura según el peso del disco
                                const getAltura = (peso) => {
                                  if (peso >= 25) return '100px'
                                  if (peso >= 20) return '95px'
                                  if (peso >= 15) return '90px'
                                  if (peso >= 10) return '85px'
                                  if (peso >= 5) return '80px'
                                  if (peso >= 2.5) return '75px'
                                  if (peso >= 1.25) return '70px'
                                  return '65px'
                                }

                                const tiposDeDiscos = Object.keys(
                                  discos.reduce((acc, disco) => {
                                    acc[disco] = true
                                    return acc
                                  }, {})
                                ).length

                                const ancho = tiposDeDiscos > 3 ? '9vw' : '12vw'

                                return (
                                  <Box
                                    key={peso}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: 2,
                                      px: '20px',
                                      py: getAltura(peso),
                                      fontSize: '100px',
                                      width: ancho,
                                      fontWeight: 'bold',
                                      color:
                                        peso == 15 ||
                                          peso == 5 ||
                                          peso == 1.25 ||
                                          peso == 0.5 ||
                                          peso == 0.25
                                          ? '#000'
                                          : '#fff',
                                      backgroundColor:
                                        peso == 25
                                          ? '#f44336'
                                          : peso == 20
                                            ? '#2196f3'
                                            : peso == 15
                                              ? '#ffeb3b'
                                              : peso == 10
                                                ? '#4caf50'
                                                : peso == 5
                                                  ? '#fff'
                                                  : peso == 2.5
                                                    ? '#000'
                                                    : peso == 1.25
                                                      ? '#C0C0C0'
                                                      : '#9e9e9e',
                                      border: peso == 5 ? '2px solid #d0d0d0' : 'none',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        lineHeight: 1,
                                      }}
                                    >
                                      <div>{peso}</div>
                                      <div style={{ fontSize: '28px' }}>x</div>
                                      <div>{cantidad}</div>
                                    </Box>
                                  </Box>
                                )
                              })}

                            <Box
                              key="tope-fijo"
                              sx={{
                                borderRadius: 1,
                                width: '40px',
                                height: '180px',
                                backgroundColor: '#9e9e9e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography
                          variant="h4"
                          sx={{
                            display: 'block',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontStyle: 'italic',
                            mt: 1,
                            variant: 'h4'
                          }}
                        >
                          Barra: 20kg + Topes: 5kg
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="h3" color="text.secondary" textAlign="center">
                          Solo barra (20kg)
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontStyle: 'italic',
                            mt: 1
                          }}
                        >
                          Barra: 20kg + Topes: 5kg
                        </Typography>
                      </>
                    )
                  ) : (
                    <Typography variant="body1" color="error" textAlign="center">
                      Este intento no tiene peso asignado
                    </Typography>
                  )}

                  <Stack
                    direction="row"
                    spacing={3}
                    justifyContent="center"
                    sx={{ mb: 3, mt: 3 }}
                  >
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={iniciarCronometro}
                        disabled={estadoJueces?.corriendo}
                        className='aspect-square'

                        sx={{
                          width: '60px',
                          height: '60px',
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          bgcolor: '#ff6b35',

                        }}
                      >
                        <PlayArrowIcon sx={{ fontSize: '50px' }} />
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={detenerCronometro}
                        disabled={!estadoJueces?.corriendo}
                        className='aspect-square'
                        sx={{
                          width: '60px',
                          height: '60px',
                          fontSize: '2rem',
                          fontWeight: 'bold'
                        }}
                      >
                        <PauseIcon sx={{ fontSize: '50px' }} />
                      </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">

                      {(() => {
                        // Verificar si todos los jueces han votado
                        const todosVotaron = 
                          estadoJueces?.juez1_valido !== null && estadoJueces?.juez1_valido !== undefined &&
                          estadoJueces?.juez2_valido !== null && estadoJueces?.juez2_valido !== undefined &&
                          estadoJueces?.juez3_valido !== null && estadoJueces?.juez3_valido !== undefined

                        return [estadoJueces?.juez1_valido, estadoJueces?.juez2_valido, estadoJueces?.juez3_valido].map(
                          (valido, index) => {
                            // Si no todos han votado, mostrar gris
                            const color = !todosVotaron
                              ? '#2e2e2e'
                              : valido === true
                                ? '#00e676'
                                : '#ff1744'

                            return (
                              <Box
                                key={index}
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 2,
                                  backgroundColor: color,
                                  boxShadow: !todosVotaron
                                    ? 'inset 0 0 10px rgba(255,255,255,0.1)'
                                    : valido === true
                                      ? '0 0 20px 4px rgba(255,255,255,0.8)'
                                      : '0 0 20px 4px rgba(255,23,68,0.6)',
                                  transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                                }}
                              />
                            )
                          }
                        )
                      })()}
                    </Stack>

                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        onClick={() => marcarIntento(true)}
                        disabled={!atletaSeleccionado || !pesoActual}
                        className='aspect-square bg-green-500'
                        sx={{
                          width: '60px',
                          height: '60px',
                          fontSize: 24,
                          fontWeight: 'bold',
                          bgcolor: '#00e676',

                        }}
                      >
                        <CheckIcon sx={{
                          fontSize: '50px', bgcolor
                            : 'transparent'
                        }} />
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => marcarIntento(false)}
                        disabled={!atletaSeleccionado || !pesoActual}
                        className='aspect-square'
                        sx={{
                          width: '60px',
                          height: '60px',
                          fontSize: 24,
                          fontWeight: 'bold',
                          backgroundColor: '#ff1744',
                          color: '#ffffff',
                          '&:hover': {
                            backgroundColor: '#d50000',
                          },
                          '&:disabled': {
                            backgroundColor: '#ffcdd2',
                            color: '#9e9e9e',
                          }
                        }}
                      >
                        <BlockIcon sx={{ fontSize: '50px' }} />
                      </Button>
                      <Button
                        variant="contained"
                        onClick={restablecerIntento}
                        disabled={!atletaSeleccionado}
                        className='aspect-square'
                        sx={{
                          width: '60px',
                          height: '60px',
                          fontSize: 24,
                          fontWeight: 'bold',
                          backgroundColor: '#FF9800',
                          color: '#ffffff',
                          '&:hover': {
                            backgroundColor: '#F57C00',
                          },
                          '&:disabled': {
                            backgroundColor: '#FFE0B2',
                            color: '#9e9e9e',
                          }
                        }}
                      >
                        <RestartAltIcon sx={{ fontSize: '50px' }} />
                      </Button>
                    </Stack>
                    {(!atletaSeleccionado || !pesoActual) && (
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 1,
                          display: 'block',
                          textAlign: 'center',
                          color: '#ef4444'
                        }}
                      >
                        Selecciona un atleta e intento para marcar el resultado
                      </Typography>
                    )}


                    <Box>
                    </Box>
                  </Stack>


                </>
              ) : (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px'
                }}>
                  <Typography variant="h6" color="text.secondary" textAlign="center">
                    Selecciona un atleta de la tabla para ver los discos
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

        </Box>
      </Box>
    </Box>
  )
}
