'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { GenericDataGrid } from '../../../components/GenericDataGrid'

export default function CargadoresPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [atletas, setAtletas] = useState([])
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null)
  const [ejercicioFiltro, setEjercicioFiltro] = useState('sentadilla')
  const [tandaFiltro, setTandaFiltro] = useState(1)
  const [intentoSeleccionado, setIntentoSeleccionado] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

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

  const calcularDiscos = (pesoTotal) => {
    if (!pesoTotal) return { discos: [], total: 0 }

    const pesoBarra = 20
    const pesoPorLado = (pesoTotal - pesoBarra) / 2

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

  const columns = [
    {
      field: 'nombre',
      headerName: 'Nombre',
      flex: 0.12,
      align: 'center',
      headerAlign: 'center',
      hide: true // Ocultar en mobile se maneja con columnVisibilityModel
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
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 1)
        return peso ? `${peso} kg` : '-'
      }
    },
    {
      field: 'intento2',
      headerName: '2°',
      flex: 0.15,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 2)
        return peso ? `${peso} kg` : '-'
      }
    },
    {
      field: 'intento3',
      headerName: '3°',
      flex: 0.15,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const peso = obtenerPesoSegunEjercicio(params.row, ejercicioFiltro, 3)
        return peso ? `${peso} kg` : '-'
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
    <Box sx={{ p: 4, minHeight: '100vh' }}>
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

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, width: '100%' }} >
          <Box sx={{ flex: 1, order: { xs: 2, md: 1 } }}>
            <Box sx={{
              width: '100%',
              height: { xs: '400px', md: 'calc(100vh - 350px)' }
            }}>
              <GenericDataGrid
                rows={atletas}
                columns={columns}
                loading={isLoading}
                paginationMode="client"
                onCellClick={handleCellClick}
                columnVisibilityModel={{
                  nombre: !isMobile,
                  tanda_id: !isMobile,
                  categoria: !isMobile,
                }}
              />
            </Box>
          </Box>

          <Box sx={{
            width: { xs: '100%', md: '350px' },
            order: { xs: 1, md: 2 },
            flexShrink: 0
          }}>
            <Paper elevation={2} sx={{ p: 3, minHeight: '600px' }}>
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
                                  disco === 25 ? '#f44336' :      // Rojo
                                    disco === 20 ? '#2196f3' :    // Azul
                                      disco === 15 ? '#ffeb3b' :  // Amarillo
                                        disco === 10 ? '#4caf50' : // Verde
                                          disco === 5 ? '#fff' :   // Blanco
                                            disco === 2.5 ? '#000' : // Negro
                                              disco === 1.25 ? '#C0C0C0' : // Plata/Gris
                                                disco === 0.5 ? '#9e9e9e' : // Cromo (gris)
                                                  '#9e9e9e', // 0.25 Cromo (gris)
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
                      <Typography variant="body1" color="text.secondary">
                        Solo barra (20kg)
                      </Typography>
                    )
                  ) : (
                    <Typography variant="body1" color="error">
                      Este intento no tiene peso asignado
                    </Typography>
                  )}

                  <Box
                    sx={{
                      mt: 4,
                      p: 3,
                      textAlign: 'center',
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #f3f4f6, #e0e7ff)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{
                        mb: 1,
  
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                    Recordatorio
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: '#374151',
                        mb: 0.5,
                      }}
                    >
                      Barra: <span style={{ color: '#2563eb', fontWeight: 'bold' }}>20 kg</span>
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: '#6b7280',
                        fontStyle: 'italic',
                        fontSize: '0.9rem',
                      }}
                    >
                      Los discos mostrados son <b>por lado</b> 🧩
                    </Typography>
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
