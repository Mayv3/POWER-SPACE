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
  Stack
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { supabase } from '../../../lib/supabaseClient'

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

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=${tandaFiltro}`
      )
      const data = await res.json()
      setAtletas(data)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAtletas()
  }, [tandaFiltro])

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
      alert('Selecciona un atleta primero')
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

      alert(valido ? '✅ Intento VÁLIDO registrado' : '❌ Intento NULO registrado')
    } catch (err) {
      console.error('Error al marcar intento:', err)
      alert('Error al registrar el intento')
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

    const intentosValidos = intentos.filter(i => i.peso && i.valido !== false)
    if (intentosValidos.length === 0) return null

    const mejor = intentosValidos.reduce((max, current) =>
      current.peso > max.peso ? current : max
    )

    return mejor.numero
  }

  const handleCellClick = (params) => {
    setAtletaSeleccionado(params.row)

    if (params.field === 'intento1') {
      setIntentoSeleccionado(1)
    } else if (params.field === 'intento2') {
      setIntentoSeleccionado(2)
    } else if (params.field === 'intento3') {
      setIntentoSeleccionado(3)
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
            peso: parseFloat(newRow[campo1])
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
            peso: parseFloat(newRow[campo2])
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
            peso: parseFloat(newRow[campo3])
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
      field: 'nombre',
      headerName: 'Nombre',
      flex: 0.12,
      align: 'center',
      headerAlign: 'center',
      hide: true
    },
    {
      field: 'apellido',
      headerName: 'Apellido',
      flex: 0.2,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'tanda_id',
      headerName: 'Tanda',
      flex: 0.08,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => `T${params.value}`
    },
    {
      field: 'categoria',
      headerName: 'Categoría',
      flex: 0.12,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'intento1',
      headerName: '1°',
      flex: 0.15,
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
      flex: 0.15,
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
      flex: 0.15,
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
    switch (ejercicio) {
      case 'sentadilla':
        return '#1976d2'
      case 'banco':
        return '#d32f2f'
      case 'peso_muerto':
        return '#388e3c'
      default:
        return '#1976d2'
    }
  }

  return (
    <Box sx={{ p: 4, minHeight: '100vh', mx: 'auto' }}>
      <Box sx={{
        display: 'flex',
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
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', },
        gap: 2
      }}>

        {atletaSeleccionado && (
          <Box backgroundColor='#ff6b35 ' sx={{ p: 2, textAlign: 'center', borderRadius: 1, mb: 2 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
              {atletaSeleccionado.nombre} {atletaSeleccionado.apellido} {atletaSeleccionado.categoria}  T{atletaSeleccionado.tanda_id}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, width: '100%', height: { xs: 'auto', md: 'calc(100vh - 250px)' } }} >
          <Box sx={{ flex: { xs: 1, md: 1 }, order: { xs: 2, md: 1 }, height: '100%' }}>
            <Box sx={{
              width: '100%',
              height: '100%'
            }}>
              <GenericDataGrid
                rows={atletas}
                columns={columns}
                loading={isLoading}
                paginationMode="client"
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
            width: { xs: '100%', md: '500px' },
            order: { xs: 1, md: 2 },
            flexShrink: 0,
            height: '100%'
          }}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', overflow: 'auto' }}>
              {atletaSeleccionado ? (
                <>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      backgroundColor: obtenerColorEjercicio(ejercicioFiltro),
                      color: 'white',
                      textAlign: 'center',
                      mb: 3
                    }}
                  >
                    <Typography variant="h3" fontWeight="bold">
                      {pesoActual} kg
                    </Typography>
                  </Paper>

                  {pesoActual > 0 ? (
                    discos.length > 0 ? (
                      <Box sx={{ position: 'relative', display: 'inline-block', py: 2 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, position: 'relative', zIndex: 1 }}>
                          {discos.map((disco, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                                height: '200px',
                                width: '40px',
                                backgroundColor:
                                  disco === 25 ? '#f44336' :
                                    disco === 20 ? '#2196f3' :
                                      disco === 15 ? '#ffeb3b' :
                                        disco === 10 ? '#4caf50' :
                                          disco === 5 ? '#fff' :
                                            disco === 2.5 ? '#000' :
                                              disco === 1.25 ? '#C0C0C0' :
                                                disco === 0.5 ? '#9e9e9e' :
                                                  '#9e9e9e',
                                color: disco === 15 || disco === 5 || disco === 1.25 || disco === 0.5 || disco === 0.25 ? '#000' : '#fff',
                                fontWeight: 'bold',
                                border: (disco === 5 || disco === 1.25) ? '2px solid #000' : 'none',
                                borderRadius: 1,
                                textOrientation: 'mixed'
                              }}
                            >
                              {disco}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body1" color="text.secondary" textAlign="center">
                        Solo barra (20kg)
                      </Typography>
                    )
                  ) : (
                    <Typography variant="body1" color="error" textAlign="center">
                      Este intento no tiene peso asignado
                    </Typography>
                  )}

                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      sx={{
                        color: estadoJueces?.corriendo ? '#1976d2' : '#9e9e9e',
                      }}
                    >
                      {estadoJueces?.tiempo_restante ?? 60}s
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: estadoJueces?.corriendo ? '#1976d2' : '#9e9e9e',
                      }}
                    >
                      {estadoJueces?.corriendo ? 'En curso' : ' Detenido'}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={iniciarCronometro}
                        disabled={estadoJueces?.corriendo}
                        sx={{
                          width: '100%',
                          fontSize: 16,
                          fontWeight: 'bold'
                        }}
                      >
                        Iniciar Timer
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={detenerCronometro}
                        disabled={!estadoJueces?.corriendo}
                        sx={{
                          width: '100%',
                          fontSize: 16,
                          fontWeight: 'bold'
                        }}
                      >
                        Detener Timer
                      </Button>
                    </Stack>



                    <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #e5e7eb' }}>
                      <Stack direction="row" spacing={2}>
                        <Button
                          variant="contained"
                          onClick={() => marcarIntento(true)}
                          disabled={!atletaSeleccionado || !pesoActual}
                          sx={{
                            width: '100%',
                            height: 60,
                            fontSize: 18,
                            fontWeight: 'bold',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            border: '2px solid #000000',
                            '&:hover': {
                              backgroundColor: '#e0e0e0',
                            },
                            '&:disabled': {
                              backgroundColor: '#f5f5f5',
                              color: '#9e9e9e',
                            }
                          }}
                        >
                          ✅ VÁLIDO
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => marcarIntento(false)}
                          disabled={!atletaSeleccionado || !pesoActual}
                          sx={{
                            width: '100%',
                            height: 60,
                            fontSize: 18,
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
                          ❌ NULO
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
                    </Box>
                  </Box>

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
