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
  CircularProgress
} from '@mui/material'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CloseIcon from '@mui/icons-material/Close'

// Import Swiper
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import './custom-swiper.css'

export default function PublicoPage() {
  const [atletas, setAtletas] = useState([])
  const [atletasFiltrados, setAtletasFiltrados] = useState([])
  const [sexoSeleccionado, setSexoSeleccionado] = useState('todos')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas')
  const [isLoading, setIsLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null)

  const categoriasMasculinas = [52, 56, 60, 67.5, 75, 82.5, 90, 100, 110, 125, 140, 140.1]
  const categoriasFemeninas = [44, 48, 52, 56, 60, 67.5, 75, 82.5, 90, 90.1]

  useEffect(() => {
    const fetchAtletas = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=todas`)
        const data = await res.json()

        const atletasConDatos = data.map((atleta) => {
          // Mejor sentadilla válida
          const sentadillaValidas = [
            atleta.valido_s1 === true ? atleta.primer_intento_sentadilla : 0,
            atleta.valido_s2 === true ? atleta.segundo_intento_sentadilla : 0,
            atleta.valido_s3 === true ? atleta.tercer_intento_sentadilla : 0
          ]
          const mejorSentadilla = Math.max(...sentadillaValidas)

          // Mejor banco válido
          const bancoValidas = [
            atleta.valido_b1 === true ? atleta.primer_intento_banco : 0,
            atleta.valido_b2 === true ? atleta.segundo_intento_banco : 0,
            atleta.valido_b3 === true ? atleta.tercer_intento_banco : 0
          ]
          const mejorBanco = Math.max(...bancoValidas)

          // Mejor peso muerto válido
          const pesoMuertoValidas = [
            atleta.valido_d1 === true ? atleta.primer_intento_peso_muerto : 0,
            atleta.valido_d2 === true ? atleta.segundo_intento_peso_muerto : 0,
            atleta.valido_d3 === true ? atleta.tercer_intento_peso_muerto : 0
          ]
          const mejorPesoMuerto = Math.max(...pesoMuertoValidas)

          const total = mejorSentadilla + mejorBanco + mejorPesoMuerto

          let dots = null
          if (total > 0 && atleta.peso_corporal > 0) {
            const c =
              atleta.sexo === 'Masculino'
                ? { a: -216.0475144, b: 16.2606339, c: -0.002388645, d: -0.00113732, e: 7.01863e-06, f: -1.291e-08 }
                : { a: 594.31747775582, b: -27.23842536447, c: 0.82112226871, d: -0.00930733913, e: 0.00004731582, f: -0.00000009054 }

            const denom =
              c.a +
              c.b * atleta.peso_corporal +
              c.c * atleta.peso_corporal ** 2 +
              c.d * atleta.peso_corporal ** 3 +
              c.e * atleta.peso_corporal ** 4 +
              c.f * atleta.peso_corporal ** 5

            dots = denom !== 0 ? (total * 500) / denom : null
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
    setAtletasFiltrados(atletas)
  }, [atletas])

  const getCategoriasDisponibles = () => {
    if (sexoSeleccionado === 'Masculino') return categoriasMasculinas
    if (sexoSeleccionado === 'Femenino') return categoriasFemeninas
    return [...new Set([...categoriasMasculinas, ...categoriasFemeninas])].sort((a, b) => a - b)
  }

  const handleVerMas = (atleta) => {
    setAtletaSeleccionado(atleta)
    setOpenModal(true)
  }

  // 🔹 Agrupar por categoría y ordenar por DOTS
  const atletasOrdenados = [...atletasFiltrados].sort((a, b) => (b.dots || 0) - (a.dots || 0))
  
  // Agrupar por categoría
  const categoriasAgrupadas = atletasOrdenados.reduce((acc, atleta) => {
    if (!acc[atleta.categoria]) acc[atleta.categoria] = []
    acc[atleta.categoria].push(atleta)
    return acc
  }, {})

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#1a1a1a', p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" textAlign='center' fontWeight="bold" sx={{ mb: 3, color: 'white' }}>
          Competidores
        </Typography>
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
        Object.entries(categoriasAgrupadas)
          .sort(([a], [b]) => a - b)
          .map(([categoria, atletas]) => (
            <Box key={categoria} sx={{ mb: 6 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
                Categoría {categoria} kg
              </Typography>

              <Swiper
                modules={[Pagination]}
                spaceBetween={20}
                slidesPerView={3}
                pagination={{ clickable: true }}
                breakpoints={{
                  320: { slidesPerView: 1 },
                  768: { slidesPerView: 2 },
                  1200: { slidesPerView: 3 }
                }}
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
  )
}
