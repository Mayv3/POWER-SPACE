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
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import { Calculate_DOTS } from '../../utils/calcularDots'
import { supabase } from '../../lib/supabaseClient'

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

  const categoriasMasculinas = [59, 66, 60, 74, 83, 93, 105, 120, 120.1]
  const categoriasFemeninas = [47, 52, 57, 63, 69, 76, 84, 84.1]

  useEffect(() => {
    const fetchAtletas = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=todas`)
        const data = await res.json()

        const atletasConDatos = data.map((atleta) => {
          // Usar solo intentos VÁLIDOS (true) para calcular los mejores levantamientos
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

          // Calcular DOTS solo si tiene al menos un intento válido en cada ejercicio
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
        setIsLoading(false)
      }
    }

    fetchAtletas()
  }, [])

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

      // Filtrar por categoría
      if (categoriaSeleccionada !== 'todas') {
        filtrados = filtrados.filter(a => parseFloat(a.categoria) === parseFloat(categoriaSeleccionada))
      }
    }

    setAtletasFiltrados(filtrados)
  }, [atletas, busqueda, sexoSeleccionado, categoriaSeleccionada])

  const getCategoriasDisponibles = () => {
    if (sexoSeleccionado === 'Masculino') return categoriasMasculinas
    if (sexoSeleccionado === 'Femenino') return categoriasFemeninas
    return []
  }

  const handleVerMas = (atleta) => {
    setAtletaSeleccionado(atleta)
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
    if (!atletaEnVivo) return []

    const atletasMismaTanda = atletas.filter(a => a.tanda_id === atletaEnVivo.tanda_id)

    const atletasOrdenados = atletasMismaTanda.sort((a, b) => {
      const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase()
      const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase()
      return nombreA.localeCompare(nombreB)
    })

    const indiceActual = atletasOrdenados.findIndex(a => a.id === atletaEnVivo.id)

    if (indiceActual === -1 || indiceActual === atletasOrdenados.length - 1) return []

    return atletasOrdenados.slice(indiceActual + 1, indiceActual + 4)
  }

  const atletasOrdenados = [...atletasFiltrados].sort((a, b) => (b.dots || 0) - (a.dots || 0))

  const categoriasAgrupadas = atletasOrdenados.reduce((acc, atleta) => {
    if (!acc[atleta.categoria]) acc[atleta.categoria] = []
    acc[atleta.categoria].push(atleta)
    return acc
  }, {})

  const categoriasOrdenadas = Object.entries(categoriasAgrupadas).sort(([catA], [catB]) => {
    const numA = parseFloat(catA)
    const numB = parseFloat(catB)

    const esMaxCatMasculina = (cat) => categoriasMasculinas.includes(parseFloat(cat))
    const esMaxCatFemenina = (cat) => categoriasFemeninas.includes(parseFloat(cat))

    const aEsMasculina = esMaxCatMasculina(catA)
    const bEsMasculina = esMaxCatMasculina(catB)

    // Si uno es masculino y otro femenino, masculino va primero
    if (aEsMasculina && !bEsMasculina) return -1
    if (!aEsMasculina && bEsMasculina) return 1

    // Si son del mismo género, ordenar por número
    return numA - numB
  })


  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#1a1a1a', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: '600px', p: 4 }}>
        {/* Banner EN VIVO */}
        {atletaEnVivo && (
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
              {atletaEnVivo.nombre} {atletaEnVivo.apellido}
            </Typography>

            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Categoría {atletaEnVivo.categoria} kg • Intento:               {estadoCompetencia?.peso ?? 0} kg

            </Typography>
          </Box>
        )}

        {/* Próximos competidores */}
        {atletaEnVivo && obtenerProximosCompetidores().length > 0 && (
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
                  backgroundColor: '#FFD700',
                  color: '#000',
                  '&:hover': {
                    backgroundColor: '#FFC700'
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
                gap: 2,
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
                    minWidth: '150px',
                    maxWidth: '150px',
                    p: 1,
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    textAlign: 'center',
                    border: '1px solid #444',
                    flexShrink: 0,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: '#FFD700',
                      transition: 'all 0.2s'
                    }
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                    {atleta.nombre} {atleta.apellido}
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
                  backgroundColor: '#FFD700',
                  color: '#000',
                  '&:hover': {
                    backgroundColor: '#FFC700'
                  },
                  width: 20,
                  height: 20
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 10 }} />
              </IconButton>
            )}
          </Box>
        )}

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" textAlign='center' fontWeight="bold" sx={{ mb: 3, color: 'white' }}>
            Competidores
          </Typography>

          {/* Buscador */}
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
                    borderColor: '#FFD700'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#FFD700'
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
                    <SearchIcon sx={{ color: '#FFD700' }} />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Filtros */}
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
                    {cat} kg
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>      {/* Carruseles por categoría */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 10 }}>
            <CircularProgress sx={{ color: 'white' }} size={60} />
          </Box>
        ) : Object.keys(categoriasAgrupadas).length === 0 ? (
          <Typography variant="h5" textAlign="center" sx={{ mt: 10, color: 'white' }}>
            No hay atletas para mostrar
          </Typography>
        ) : (
          categoriasOrdenadas.map(([categoria, atletas]) => (
            <Box key={categoria} sx={{ mb: 6 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
                Categoría {categoria} kg
              </Typography>

              <Swiper
                modules={[Pagination]}
                spaceBetween={20}
                slidesPerView={1}
                pagination={{ clickable: true }}
              >
                {atletas.map((atleta, index) => {
                  // Determinar color de medalla según posición
                  const puesto = index + 1
                  let colorMedalla = 'transparent'
                  let textoMedalla = ''

                  if (puesto === 1) {
                    colorMedalla = '#FFD700' // Oro
                    textoMedalla = '🥇 1er Lugar'
                  } else if (puesto === 2) {
                    colorMedalla = '#C0C0C0' // Plata
                    textoMedalla = '🥈 2do Lugar'
                  } else if (puesto === 3) {
                    colorMedalla = '#CD7F32' // Bronce
                    textoMedalla = '🥉 3er Lugar'
                  }

                  return (
                    <SwiperSlide key={atleta.id}>
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
                        {/* Barra de medalla */}
                        {puesto <= 3 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '10px',
                              backgroundColor: colorMedalla,
                              zIndex: 1
                            }}
                          />
                        )}

                        <CardContent sx={{ flexGrow: 1, pt: puesto <= 3 ? 3 : 2 }}>
                          {puesto <= 3 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                              <Box
                                sx={{
                                  backgroundColor: colorMedalla,
                                  color: '#000',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {textoMedalla}
                              </Box>
                            </Box>
                          )}

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

                          <Typography variant="subtitle2" textAlign='center' fontWeight="bold" sx={{ mb: 1, color: 'white' }}>
                            Mejores Levantamientos
                          </Typography>

                          {[
                            ['Sentadilla', atleta.mejorSentadilla],
                            ['Banco', atleta.mejorBanco],
                            ['Peso Muerto', atleta.mejorPesoMuerto]
                          ].map(([label, val]) => (
                            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>{label}:</Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>
                                {val || 0} kg
                              </Typography>
                            </Box>
                          ))}

                          <Divider sx={{ my: 1, borderColor: '#444' }} />

                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                              Total:
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" color="primary">
                              {atleta.total || 0} kg
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                              DOTS:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="secondary">
                              {atleta.dots ? atleta.dots.toFixed(2) : 'N/A'}
                            </Typography>
                          </Box>

                          <Button variant="contained" fullWidth sx={{ mt: 2, backgroundColor: '#FFD700', color: '#000', fontWeight: 'bold', '&:hover': { backgroundColor: '#FFC700' } }} onClick={() => handleVerMas(atleta)}>
                            Ver más
                          </Button>
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
                    ['Categoría', `${atletaSeleccionado.categoria} kg`],
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
