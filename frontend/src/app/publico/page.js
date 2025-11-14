'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Divider,
  Grid,
  Button,
  Modal,
  Card,
  CardContent,
  Skeleton,
  TextField,
  InputAdornment,
  LinearProgress
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import { Calculate_DOTS } from '../../utils/calcularDots'
import { supabase } from '../../lib/supabaseClient'
import categorias from '../../const/categorias/categorias'

// Import Swiper
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import './custom-swiper.css'

export default function PublicoPage() {
  const [atletas, setAtletas] = useState([])
  const [atletasFiltrados, setAtletasFiltrados] = useState([])
  const [sexoSeleccionado, setSexoSeleccionado] = useState('Masculino')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas')
  const [isLoading, setIsLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [atletaEnVivo, setAtletaEnVivo] = useState(null)
  const [estadoCompetencia, setEstadoCompetencia] = useState(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  useEffect(() => {
    const fetchAtletas = async () => {
      if (isFirstLoad) setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=todas`)
        const data = await res.json()

        const atletasConDatos = data.map((atleta) => {
          console.log('Atleta:', atleta.nombre, {
            valido_s1: atleta.valido_s1, tipo_s1: typeof atleta.valido_s1,
            valido_s2: atleta.valido_s2, tipo_s2: typeof atleta.valido_s2,
            valido_s3: atleta.valido_s3, tipo_s3: typeof atleta.valido_s3,
          })

          const sentadillaValidos = [
            atleta.valido_s1 === true ? (atleta.primer_intento_sentadilla || 0) : 0,
            atleta.valido_s2 === true ? (atleta.segundo_intento_sentadilla || 0) : 0,
            atleta.valido_s3 === true ? (atleta.tercer_intento_sentadilla || 0) : 0
          ]
          const mejorSentadilla = Math.max(...sentadillaValidos)

          const bancoValidos = [
            atleta.valido_b1 === true ? (atleta.primer_intento_banco || 0) : 0,
            atleta.valido_b2 === true ? (atleta.segundo_intento_banco || 0) : 0,
            atleta.valido_b3 === true ? (atleta.tercer_intento_banco || 0) : 0
          ]
          const mejorBanco = Math.max(...bancoValidos)

          const pesoMuertoValidos = [
            atleta.valido_d1 === true ? (atleta.primer_intento_peso_muerto || 0) : 0,
            atleta.valido_d2 === true ? (atleta.segundo_intento_peso_muerto || 0) : 0,
            atleta.valido_d3 === true ? (atleta.tercer_intento_peso_muerto || 0) : 0
          ]
          const mejorPesoMuerto = Math.max(...pesoMuertoValidos)

          const total = mejorSentadilla + mejorBanco + mejorPesoMuerto

          const tieneSentadillaValida = atleta.valido_s1 === true || atleta.valido_s2 === true || atleta.valido_s3 === true
          const tieneBancoValido = atleta.valido_b1 === true || atleta.valido_b2 === true || atleta.valido_b3 === true
          const tienePesoMuertoValido = atleta.valido_d1 === true || atleta.valido_d2 === true || atleta.valido_d3 === true
          const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

          let dots = atleta.dots
          if (!dots && tieneTodasLasValidaciones && total > 0 && atleta.peso_corporal > 0) {
            const isFemale = atleta.sexo === 'F'
            dots = parseFloat(Calculate_DOTS(atleta.peso_corporal, total, isFemale))
          }

          return {
            ...atleta,
            mejorSentadilla,
            mejorBanco,
            mejorPesoMuerto,
            total,
            dots
          }
        })

        setAtletas(atletasConDatos)
        setAtletasFiltrados(atletasConDatos)
      } catch (err) {
        console.error('Error al cargar atletas:', err)
      } finally {
        if (isFirstLoad) {
          setIsLoading(false)
          setIsFirstLoad(false)
        }
      }
    }

    fetchAtletas()

    const channelIntentos = supabase
      .channel('public:intentos_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intentos'
        },
        () => {
          // Recargar atletas cuando hay cambios en intentos
          setIsUpdating(true)
          fetchAtletas().finally(() => {
            setTimeout(() => setIsUpdating(false), 500)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelIntentos)
    }
  }, [])

  useEffect(() => {
    if (atletaSeleccionado && atletas.length > 0) {
      const atletaActualizado = atletas.find(a => a.id === atletaSeleccionado.id)
      if (atletaActualizado) {
        setAtletaSeleccionado(atletaActualizado)
      }
    }
  }, [atletas])

  useEffect(() => {
    const fetchAtletaEnVivo = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces`)
        const data = await res.json()
        setEstadoCompetencia(data)

        if (data.atleta_id) {
          const atletaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${data.atleta_id}`)
          const atletaData = await atletaRes.json()
          setAtletaEnVivo(atletaData)
        } else {
          setAtletaEnVivo(null)
        }
      } catch (err) {
        console.error('Error al cargar atleta en vivo:', err)
      }
    }

    fetchAtletaEnVivo()

    const channel = supabase
      .channel('public:estado_competencia_publico')
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
            setAtletaEnVivo(atletaData)
          } else {
            setAtletaEnVivo(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let filtrados = atletas

    // Si hay búsqueda, solo filtrar por nombre (ignorar sexo y categoría)
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      filtrados = filtrados.filter(a =>
        a.nombre?.toLowerCase().includes(termino) ||
        a.apellido?.toLowerCase().includes(termino) ||
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(termino)
      )
    } else {
      // Si no hay búsqueda, aplicar filtros de sexo y categoría
      const sexoAbreviado = sexoSeleccionado === 'Masculino' ? 'M' : 'F'
      filtrados = filtrados.filter(a => a.sexo === sexoAbreviado)

      // Filtrar por categoría (comparar el texto completo como "F - A1")
      if (categoriaSeleccionada !== 'todas') {
        filtrados = filtrados.filter(a => a.categoria === categoriaSeleccionada)
      }
    }

    setAtletasFiltrados(filtrados)
  }, [atletas, busqueda, sexoSeleccionado, categoriaSeleccionada])

  const getCategoriasDisponibles = () => {
    if (sexoSeleccionado === 'Masculino') return categorias.M
    if (sexoSeleccionado === 'Femenino') return categorias.F
    return []
  }

  const handleVerMas = (atleta) => {
    // Buscar el atleta con todos los datos calculados en el estado atletas
    const atletaCompleto = atletas.find(a => a.id === atleta.id) || atleta
    setAtletaSeleccionado(atletaCompleto)
    setOpenModal(true)
  }

  const handleScrollProximos = (direction) => {
    const container = document.getElementById('proximos-scroll')
    if (container) {
      const scrollAmount = 200
      if (direction === 'left') {
        container.scrollLeft -= scrollAmount
      } else {
        container.scrollLeft += scrollAmount
      }
      setScrollPosition(container.scrollLeft)
    }
  }

  const obtenerProximosCompetidores = () => {
    if (!atletaEnVivo || !estadoCompetencia) return []

    // Si existe un orden guardado en el estado de competencia, usarlo
    if (estadoCompetencia.orden_proximos && Array.isArray(estadoCompetencia.orden_proximos)) {
      // Mapear los IDs a los objetos de atletas completos
      return estadoCompetencia.orden_proximos
        .map(id => atletas.find(a => a.id === id))
        .filter(Boolean) // Filtrar los que no se encontraron
    }

    // Fallback: usar el array de atletas como viene del backend
    // Filtrar solo los de la misma tanda
    const atletasMismaTanda = atletas.filter(a => a.tanda_id === atletaEnVivo.tanda_id)

    // Encontrar el índice del atleta en vivo en el array filtrado
    const indiceActual = atletasMismaTanda.findIndex(a => a.id === atletaEnVivo.id)

    // Si no se encuentra, no hay próximos
    if (indiceActual === -1) return []

    // Retornar TODOS los atletas que siguen después del actual
    return atletasMismaTanda.slice(indiceActual + 1)
  }

  const atletasOrdenados = [...atletasFiltrados].sort((a, b) => (b.dots || 0) - (a.dots || 0))

  const categoriasAgrupadas = atletasOrdenados.reduce((acc, atleta) => {
    if (!acc[atleta.categoria]) acc[atleta.categoria] = []
    acc[atleta.categoria].push(atleta)
    return acc
  }, {})

  const categoriasOrdenadas = Object.entries(categoriasAgrupadas).sort(([catA], [catB]) => {
    const getCategoriaBase = (cat) => {
      const match = cat.match(/([A-C][12])/)
      return match ? match[1] : cat
    }

    const baseA = getCategoriaBase(catA)
    const baseB = getCategoriaBase(catB)

    const aEsMasculina = catA.startsWith('M')
    const bEsMasculina = catB.startsWith('M')

    if (aEsMasculina && !bEsMasculina) return -1
    if (!aEsMasculina && bEsMasculina) return 1

    return baseA.localeCompare(baseB)
  })


  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#1a1a1a', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: '600px', p: 4 }}>
        {/* Banner EN VIVO */}
        {isFirstLoad && isLoading ? (
          <Skeleton
            variant="rectangular"
            height={120}
            sx={{ bgcolor: '#2a2a2a', borderRadius: 2, mb: 3 }}
          />
        ) : (
          atletaEnVivo && (
            <Box
              onClick={() => handleVerMas(atletaEnVivo)}
              sx={{
                backgroundColor: '#FFD700',
                color: '#000',
                p: 2,
                borderRadius: 2,
                mb: 3,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                animation: 'pulse 2s infinite',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.8)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s'
                },
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)' },
                  '50%': { boxShadow: '0 4px 20px rgba(255, 215, 0, 0.8)' },
                  '100%': { boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)' }
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#ff0000',
                    animation: 'blink 1s infinite',
                    '@keyframes blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.3 }
                    }
                  }}
                />
                <Typography variant="overline" fontWeight="bold" sx={{ fontSize: '0.9rem', letterSpacing: 1 }}>
                  EN VIVO
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                {atletaEnVivo.nombre?.split(' ').join(' ')} {atletaEnVivo.apellido?.split(' ').join(' ')}
              </Typography>

              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Categoría {atletaEnVivo.categoria} • Intento: {estadoCompetencia?.peso ?? 0} kg
              </Typography>
            </Box>
          )
        )}

        {/* Próximos competidores */}
        {isFirstLoad && isLoading ? (
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                width={150}
                height={50}
                sx={{ bgcolor: '#2a2a2a', borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : (
          atletaEnVivo && obtenerProximosCompetidores().length > 0 && (
            <Box sx={{ mb: 3, position: 'relative' }}>
              {scrollPosition > 0 && (
                <IconButton
                  onClick={() => handleScrollProximos('left')}
                  sx={{
                    position: 'absolute',
                    left: -10,
                    top: '40%',
                    transform: 'translateY(-50%)',
                    zIndex: 2,
                    backgroundColor: 'transparent',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '##f16511'
                    },
                    width: 20,
                    height: 20
                  }}
                >
                  <ArrowBackIosIcon sx={{ fontSize: 10, ml: 0.5 }} />
                </IconButton>
              )}

              {/* Contenedor scroll */}
              <Box
                id="proximos-scroll"
                onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  scrollBehavior: 'smooth',
                  '&::-webkit-scrollbar': {
                    display: 'none'
                  },
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                  pb: 1
                }}
              >
                {obtenerProximosCompetidores().map((atleta) => (
                  <Paper
                    key={atleta.id}
                    onClick={() => handleVerMas(atleta)}
                    sx={{
                      minWidth: '100px',
                      maxWidth: '100px',
                      p: 1,
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                      textAlign: 'center',
                      border: '1px solid #444',
                      flexShrink: 0,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#f16511',
                        transition: 'all 0.2s'
                      }
                    }}
                  >
                    <Typography fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                      {atleta.apellido}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {/* Flecha derecha */}
              {obtenerProximosCompetidores().length > 2 && (
                <IconButton
                  onClick={() => handleScrollProximos('right')}
                  sx={{
                    position: 'absolute',
                    right: -10,
                    top: '40%',
                    transform: 'translateY(-50%)',
                    zIndex: 2,
                    backgroundColor: 'transparent',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#f16511'
                    },
                    width: 20,
                    height: 20
                  }}
                >
                  <ArrowForwardIosIcon sx={{ fontSize: 10 }} />
                </IconButton>
              )}
            </Box>
          )
        )}

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>


          {/* Buscador */}
          {isFirstLoad && isLoading ? (
            <Skeleton
              variant="rectangular"
              height={56}
              sx={{ bgcolor: '#2a2a2a', borderRadius: 1, mb: 2 }}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <TextField
                placeholder="Buscar atleta por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                sx={{
                  width: '100%',
                  backgroundColor: '#2a2a2a',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: '#444'
                    },
                    '&:hover fieldset': {
                      borderColor: '#f16511'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#f16511'
                    }
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#b0b0b0',
                    opacity: 1
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#f16511' }} />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          )}

          {/* Filtros */}
          {isFirstLoad && isLoading ? (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Skeleton
                variant="rectangular"
                width={150}
                height={56}
                sx={{ bgcolor: '#2a2a2a', borderRadius: 1 }}
              />
              <Skeleton
                variant="rectangular"
                width={150}
                height={56}
                sx={{ bgcolor: '#2a2a2a', borderRadius: 1 }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {/* Selector de Sexo */}
              <FormControl
                sx={{
                  minWidth: 150,
                  backgroundColor: '#2a2a2a',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: '#444'
                    },
                    '&:hover fieldset': {
                      borderColor: '#FFD700'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFD700'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#b0b0b0'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#FFD700'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#FFD700'
                  }
                }}
              >
                <InputLabel>Sexo</InputLabel>
                <Select
                  value={sexoSeleccionado}
                  label="Sexo"
                  onChange={(e) => {
                    setSexoSeleccionado(e.target.value)
                    setCategoriaSeleccionada('todas')
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: '#2a2a2a',
                        color: 'white',
                        '& .MuiMenuItem-root': {
                          '&:hover': {
                            backgroundColor: '#3a3a3a'
                          },
                          '&.Mui-selected': {
                            backgroundColor: '#FFD70033',
                            '&:hover': {
                              backgroundColor: '#FFD70055'
                            }
                          }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="Masculino">Masculino</MenuItem>
                  <MenuItem value="Femenino">Femenino</MenuItem>
                </Select>
              </FormControl>

              {/* Selector de Categoría */}
              <FormControl
                sx={{
                  minWidth: 150,
                  backgroundColor: '#2a2a2a',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: '#444'
                    },
                    '&:hover fieldset': {
                      borderColor: '#FFD700'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFD700'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#b0b0b0'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#FFD700'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#FFD700'
                  }
                }}
              >
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={categoriaSeleccionada}
                  label="Categoría"
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: '#2a2a2a',
                        color: 'white',
                        '& .MuiMenuItem-root': {
                          '&:hover': {
                            backgroundColor: '#3a3a3a'
                          },
                          '&.Mui-selected': {
                            backgroundColor: '#FFD70033',
                            '&:hover': {
                              backgroundColor: '#FFD70055'
                            }
                          }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="todas">Todas las categorías</MenuItem>
                  {getCategoriasDisponibles().map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
        {isFirstLoad && isLoading ? (
          <Box>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ mb: 6 }}>
                <Skeleton variant="text" width="60%" height={50} sx={{ bgcolor: '#3a3a3a', mx: 'auto', mb: 2 }} />
                <Card sx={{ backgroundColor: '#2a2a2a' }}>
                  <CardContent>
                    <Skeleton variant="rectangular" height={20} sx={{ bgcolor: '#3a3a3a', mb: 2 }} />
                    <Skeleton variant="text" height={30} sx={{ bgcolor: '#3a3a3a', mb: 1 }} />
                    <Skeleton variant="text" height={20} sx={{ bgcolor: '#3a3a3a', mb: 1 }} />
                    <Skeleton variant="text" height={20} sx={{ bgcolor: '#3a3a3a', mb: 2 }} />
                    <Skeleton variant="rectangular" height={100} sx={{ bgcolor: '#3a3a3a', mb: 2 }} />
                    <Skeleton variant="rectangular" height={40} sx={{ bgcolor: '#3a3a3a' }} />
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        ) : Object.keys(categoriasAgrupadas).length === 0 ? (
          <Typography variant="h5" textAlign="center" sx={{ mt: 10, color: 'white' }}>
            No hay atletas para mostrar
          </Typography>
        ) : (
          categoriasOrdenadas.map(([categoria, atletas]) => (
            <Box key={categoria} sx={{ mb: 6 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
                Categoría {categoria}
              </Typography>

              <Swiper
                modules={[Pagination]}
                spaceBetween={20}
                slidesPerView={1}
                pagination={{ clickable: true }}
              >
                {atletas.map((atleta, index) => {
                  // Verificar si tiene al menos un intento válido en cada ejercicio
                  const tieneSentadillaValida = atleta.valido_s1 === true || atleta.valido_s2 === true || atleta.valido_s3 === true
                  const tieneBancoValido = atleta.valido_b1 === true || atleta.valido_b2 === true || atleta.valido_b3 === true
                  const tienePesoMuertoValido = atleta.valido_d1 === true || atleta.valido_d2 === true || atleta.valido_d3 === true
                  const tieneIntentosValidosCompletos = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

                  const puesto = index + 1
                  let colorMedalla = 'transparent'
                  let textoMedalla = ''

                  if (tieneIntentosValidosCompletos) {
                    if (puesto === 1) {
                      colorMedalla = '#FFD700'
                      textoMedalla = '🥇 1er Puesto'
                    } else if (puesto === 2) {
                      colorMedalla = '#C0C0C0' // Plata
                      textoMedalla = '🥈 2do Puesto'
                    } else if (puesto === 3) {
                      colorMedalla = '#CD7F32' // Bronce
                      textoMedalla = '🥉 3er Puesto'
                    } else {
                      colorMedalla = 'orange'
                      textoMedalla = `${puesto}° Lugar`
                    }
                  } else {
                    // Si no tiene intentos válidos completos, mostrar posición tentativa
                    colorMedalla = '#555'
                    textoMedalla = `${puesto}° Lugar`
                  }

                  return (
                    <SwiperSlide key={atleta.id}
                    >
                      <Card
                        elevation={3}
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: '#2a2a2a',
                          color: 'white',
                          transition: 'box-shadow 0.2s',
                          '&:hover': { boxShadow: 6 },
                          position: 'relative',
                          overflow: 'visible'
                        }}
                      >
                        {isUpdating && (
                          <LinearProgress
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              zIndex: 10,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#FFD700'
                              },
                              backgroundColor: 'rgba(255, 215, 0, 0.1)'
                            }}
                          />
                        )}

                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '10px',
                            borderTopLeftRadius: '5px',
                            borderTopRightRadius: '5px',
                            backgroundColor: colorMedalla,
                            zIndex: 1
                          }}
                        />

                        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                            <Box
                              sx={{
                                backgroundColor: colorMedalla,
                                color: tieneIntentosValidosCompletos ? '#000' : '#fff',
                                padding: '4px 12px',
                                borderRadius: '12px',

                                fontWeight: 'bold',
                                fontSize: '0.75rem'
                              }}
                            >
                              {textoMedalla}
                            </Box>
                          </Box>

                          <Typography variant="h5" textAlign='center' fontWeight="bold" sx={{ mb: 1, color: 'white' }}>
                            {atleta.nombre} {atleta.apellido}
                          </Typography>

                          <Typography variant="body2" textAlign='center' sx={{ color: '#b0b0b0' }}>
                            Peso corporal: {atleta.peso_corporal} kg
                          </Typography>
                          <Typography variant="body2" textAlign='center' sx={{ color: '#b0b0b0' }}>
                            Edad: {atleta.edad || 'N/A'}
                          </Typography>

                          <Divider sx={{ my: 2, borderColor: '#444' }} />


                          <Box
                         
                          >
                            
                          <Typography variant="subtitle2" textAlign='center' fontWeight="bold" sx={{ mb: 1, color: 'white' }}>
                            Mejores Levantamientos
                          </Typography>
                            {[
                              { label: 'Sentadilla', val: atleta.mejorSentadilla, color: '#5CCEFF' },
                              { label: 'Banco', val: atleta.mejorBanco, color: '#FF5C5C' },
                              { label: 'Peso Muerto', val: atleta.mejorPesoMuerto, color: '#FFA45C' },
                            ].map(({ label, val, color, icon }) => (
                              <Box key={label} sx={{ mb: 1.2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                    {icon} {label}
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold" sx={{ color }}>
                                    {val || 0} kg
                                  </Typography>
                                </Box>
                                {/* Mini barra visual */}
                                <Box
                                  sx={{
                                    height: 5,
                                    borderRadius: 2,
                                    background: color,
                                    mt: 0.5,
                                  }}
                                />
                              </Box>
                            ))}

                            <Divider sx={{ my: 2, borderColor: '#555' }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6" fontWeight="bold">
                                Total
                              </Typography>
                              <Typography variant="h5" fontWeight="bold" sx={{ color: '#FFC700' }}>
                                {atleta.total || 0} kg
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                DOTS
                              </Typography>
                              <Typography variant="body1" fontWeight="bold" color="secondary">
                                {atleta.dots ? atleta.dots.toFixed(2) : 'N/A'}
                              </Typography>
                            </Box>

                            <Button
                              fullWidth
                              variant="contained"
                              sx={{
                                mt: 2,
                                background: 'linear-gradient(90deg, #f16511, #FFC700)',
                                fontWeight: 'bold',
                                borderRadius: 2,
                                color: 'black',
                                '&:hover': { background: 'linear-gradient(90deg, #FFC700, #f16511)' },
                              }}
                              onClick={() => handleVerMas(atleta)}
                            >
                              Ver más detalles
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </SwiperSlide>
                  )
                })}
              </Swiper>
            </Box>
          ))
        )}

        {/* Modal Detalle */}
        <Modal open={openModal} onClose={() => setOpenModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ maxWidth: 500, width: '95%', maxHeight: '90vh', overflowY: 'auto', p: 3, position: 'relative', borderRadius: 2, backgroundColor: '#2a2a2a', color: 'white' }}>
            <IconButton onClick={() => setOpenModal(false)} sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}>
              <CloseIcon />
            </IconButton>

            {atletaSeleccionado && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'white' }}>
                  {atletaSeleccionado.nombre} {atletaSeleccionado.apellido}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }} justifyContent="center">
                  {[
                    ['Categoría', atletaSeleccionado.categoria],
                    ['Peso Corporal', `${atletaSeleccionado.peso_corporal} kg`],
                    ['Edad', atletaSeleccionado.edad || 'N/A'],
                    ['Modalidad', atletaSeleccionado.modalidad]
                  ].map(([label, val]) => (
                    <Grid item xs={6} key={label} sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        {label}
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>{val}</Typography>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2, borderColor: '#444' }} />

                <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: 'white' }}>
                  Detalle de Intentos
                </Typography>

                {[
                  ['Sentadilla', 'sentadilla', 's', 'primary', atletaSeleccionado.mejorSentadilla],
                  ['Press de Banco', 'banco', 'b', 'error', atletaSeleccionado.mejorBanco],
                  ['Peso Muerto', 'peso_muerto', 'd', 'success', atletaSeleccionado.mejorPesoMuerto]
                ].map(([titulo, nombre, prefijo, color, mejorPeso]) => (
                  <Box sx={{ mb: 2 }} key={titulo}>
                    <Typography variant="h6" fontWeight="bold" color={color} sx={{ mb: 1 }}>
                      {titulo}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                      {[1, 2, 3].map((num) => {
                        const nombreIntento = num === 1 ? 'primer' : num === 2 ? 'segundo' : 'tercer'
                        const peso = atletaSeleccionado[`${nombreIntento}_intento_${nombre}`]
                        const valido = atletaSeleccionado[`valido_${prefijo}${num}`]
                        return (
                          <Paper
                            key={num}
                            sx={{
                              flex: 1,
                              p: 1.5,
                              textAlign: 'center',
                              backgroundColor: valido === true ? '#1b5e20' : valido === false ? '#b71c1c' : '#3a3a3a'
                            }}
                          >
                            <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                              Intento {num}
                            </Typography>
                            <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                              {peso || '-'} {peso ? 'kg' : ''}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: valido === true ? '#66bb6a' : valido === false ? '#ef5350' : '#888' }}
                            >
                              {valido === true ? '✓' : valido === false ? '✗' : '-'}
                            </Typography>
                          </Paper>
                        )
                      })}
                    </Box>
                    {/* Mejor peso del ejercicio */}
                    <Box sx={{ mt: 1, textAlign: 'center', backgroundColor: '#1a1a1a', p: 1, borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        Mejor: <Typography component="span" variant="h6" fontWeight="bold" sx={{ color: 'white' }}>{mejorPeso} kg</Typography>
                      </Typography>
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2, borderColor: '#444' }} />

                <Paper sx={{ p: 2, backgroundColor: '#1a1a1a', borderRadius: 2 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={6} sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        Total
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {atletaSeleccionado.total} kg
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        DOTS
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="secondary">
                        {atletaSeleccionado.dots ? atletaSeleccionado.dots.toFixed(2) : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
          </Paper>
        </Modal>
      </Box>
    </Box>
  )
}
