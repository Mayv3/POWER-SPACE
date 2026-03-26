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
        async (payload) => {
          const atleta_id = payload.new?.atleta_id || payload.old?.atleta_id
          if (!atleta_id) return

          setIsUpdating(true)
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?atleta_id=${atleta_id}`)
            const data = await res.json()
            if (!data.length) return

            const atleta = data[0]
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
            const tieneTodasLasValidaciones =
              (atleta.valido_s1 === true || atleta.valido_s2 === true || atleta.valido_s3 === true) &&
              (atleta.valido_b1 === true || atleta.valido_b2 === true || atleta.valido_b3 === true) &&
              (atleta.valido_d1 === true || atleta.valido_d2 === true || atleta.valido_d3 === true)
            let dots = atleta.dots
            if (!dots && tieneTodasLasValidaciones && total > 0 && atleta.peso_corporal > 0) {
              dots = parseFloat(Calculate_DOTS(atleta.peso_corporal, total, atleta.sexo === 'F'))
            }

            const atletaActualizado = { ...atleta, mejorSentadilla, mejorBanco, mejorPesoMuerto, total, dots }
            setAtletas(prev => prev.map(a => a.id === atleta_id ? atletaActualizado : a))
          } catch (err) {
            console.error('Error al actualizar atleta:', err)
          } finally {
            setTimeout(() => setIsUpdating(false), 500)
          }
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
      const { data } = await supabase.from('estado_competencia').select('*').eq('id', 1).single()
      if (!data) return
      setEstadoCompetencia(data)

      if (data.atleta_id) {
        const { data: atletaData } = await supabase.from('atletas').select('*').eq('id', data.atleta_id).single()
        setAtletaEnVivo(atletaData)
      } else {
        setAtletaEnVivo(null)
      }
    }

    fetchAtletaEnVivo()

    const channel = supabase
      .channel('public:estado_competencia_publico')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        async (payload) => {
          setEstadoCompetencia(payload.new)
          if (payload.new.atleta_id) {
            const { data: atletaData } = await supabase.from('atletas').select('*').eq('id', payload.new.atleta_id).single()
            setAtletaEnVivo(atletaData)
          } else {
            setAtletaEnVivo(null)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    const getPeso = (cat) => {
      const match = cat.match(/\+?(\d+)kg/)
      if (!match) return 0
      return cat.includes('+') ? parseInt(match[1]) + 0.5 : parseInt(match[1])
    }

    const aEsMasculina = catA.startsWith('M')
    const bEsMasculina = catB.startsWith('M')

    if (aEsMasculina && !bEsMasculina) return -1
    if (!aEsMasculina && bEsMasculina) return 1

    return getPeso(catA) - getPeso(catB)
  })


  // Paleta de colores del diseño
  const C = {
    bg: '#0d0d0d',
    surface: '#141414',
    surfaceHover: '#1c1c1c',
    border: '#252525',
    borderSubtle: '#1a1a1a',
    textPrimary: '#f0f0f0',
    textSecondary: '#909090',
    textMuted: '#3e3e3e',
    gold: '#d4a843',
    goldDim: '#9a7232',
  }

  const selectMenuProps = {
    PaperProps: {
      sx: {
        backgroundColor: '#131313',
        border: '1px solid #222',
        borderRadius: '8px',
        color: C.textPrimary,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        '& .MuiMenuItem-root': {
          fontSize: '0.85rem',
          py: 1,
          '&:hover': { backgroundColor: '#1a1a1a' },
          '&.Mui-selected': { backgroundColor: '#1c1a10', '&:hover': { backgroundColor: '#221f12' } }
        }
      }
    }
  }

  const selectSx = {
    backgroundColor: C.surface,
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
      color: C.textPrimary,
      fontSize: '0.85rem',
      '& fieldset': { borderColor: C.border },
      '&:hover fieldset': { borderColor: '#2e2e2e' },
      '&.Mui-focused fieldset': { borderColor: C.goldDim }
    },
    '& .MuiInputLabel-root': { color: C.textSecondary, fontSize: '0.82rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: C.gold },
    '& .MuiSvgIcon-root': { color: C.textSecondary }
  }

  const getPuestoConfig = (puesto, tieneCompletos) => {
    if (!tieneCompletos) return { borderColor: C.border, labelColor: C.textSecondary, label: `${puesto}°`, glow: false }
    if (puesto === 1) return { borderColor: C.gold, labelColor: C.gold, label: '1°', glow: true }
    if (puesto === 2) return { borderColor: '#b8b8b8', labelColor: '#d0d0d0', label: '2°', glow: false }
    if (puesto === 3) return { borderColor: '#cd7f32', labelColor: '#e0924a', label: '3°', glow: false }
    return { borderColor: C.border, labelColor: C.textSecondary, label: `${puesto}°`, glow: false }
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: C.bg }}>
      {/* Loading bar sutil */}
      {isUpdating && (
        <LinearProgress sx={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: '2px',
          backgroundColor: 'transparent',
          '& .MuiLinearProgress-bar': { backgroundColor: C.gold }
        }} />
      )}

      <Box sx={{ width: '100%', maxWidth: '560px', mx: 'auto', px: 2.5, py: 3 }}>

        {/* ── EN VIVO ── */}
        {isFirstLoad && isLoading ? (
          <Skeleton variant="rectangular" height={76} sx={{ bgcolor: '#151515', borderRadius: '10px', mb: 2 }} />
        ) : atletaEnVivo && (
          <Box
            onClick={() => handleVerMas(atletaEnVivo)}
            sx={{
              mb: 2.5, px: 2.5, py: 1.75,
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderLeft: `2px solid ${C.gold}`,
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background 0.15s',
              '&:hover': { backgroundColor: C.surfaceHover }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{
                width: 5, height: 5, borderRadius: '50%', backgroundColor: '#c0392b', flexShrink: 0,
                animation: 'blink 1.5s infinite',
                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.15 } }
              }} />
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', color: C.gold, textTransform: 'uppercase' }}>
                En vivo
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: C.textPrimary, lineHeight: 1.25, mb: 0.25 }}>
              {atletaEnVivo.nombre} {atletaEnVivo.apellido}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: C.textSecondary }}>
              {atletaEnVivo.categoria} · {estadoCompetencia?.peso ?? 0} kg
            </Typography>
          </Box>
        )}

        {/* ── PRÓXIMOS ── */}
        {!isLoading && atletaEnVivo && obtenerProximosCompetidores().length > 0 && (
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', color: C.textMuted, textTransform: 'uppercase', mb: 1.25 }}>
              Próximos
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {scrollPosition > 0 && (
                <IconButton onClick={() => handleScrollProximos('left')} sx={{
                  position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 2, width: 24, height: 24, color: C.textSecondary, backgroundColor: C.surface,
                  border: `1px solid ${C.border}`, '&:hover': { backgroundColor: C.surfaceHover }
                }}>
                  <ArrowBackIosIcon sx={{ fontSize: 9, ml: 0.5 }} />
                </IconButton>
              )}
              <Box
                id="proximos-scroll"
                onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
                sx={{ display: 'flex', gap: 1, overflowX: 'auto', scrollBehavior: 'smooth', pb: 0.5,
                  '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
              >
                {obtenerProximosCompetidores().map((atleta) => (
                  <Box key={atleta.id} onClick={() => handleVerMas(atleta)} sx={{
                    minWidth: 84, px: 1.5, py: 0.875,
                    backgroundColor: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: '7px', cursor: 'pointer', flexShrink: 0,
                    transition: 'border-color 0.15s, background 0.15s',
                    '&:hover': { backgroundColor: C.surfaceHover, borderColor: '#2a2a2a' }
                  }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#707070', whiteSpace: 'nowrap' }}>
                      {atleta.apellido}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {obtenerProximosCompetidores().length > 2 && (
                <IconButton onClick={() => handleScrollProximos('right')} sx={{
                  position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 2, width: 24, height: 24, color: C.textSecondary, backgroundColor: C.surface,
                  border: `1px solid ${C.border}`, '&:hover': { backgroundColor: C.surfaceHover }
                }}>
                  <ArrowForwardIosIcon sx={{ fontSize: 9 }} />
                </IconButton>
              )}
            </Box>
          </Box>
        )}

        {/* ── BUSCADOR + FILTROS ── */}
        <Box sx={{ mb: 4 }}>
          {isFirstLoad && isLoading ? (
            <Skeleton variant="rectangular" height={44} sx={{ bgcolor: '#151515', borderRadius: '8px', mb: 1.5 }} />
          ) : (
            <TextField
              placeholder="Buscar atleta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              fullWidth
              size="small"
              sx={{
                mb: 1.5,
                backgroundColor: C.surface,
                borderRadius: '8px',
                '& .MuiOutlinedInput-root': {
                  color: C.textPrimary,
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  '& fieldset': { borderColor: C.border },
                  '&:hover fieldset': { borderColor: '#2e2e2e' },
                  '&.Mui-focused fieldset': { borderColor: C.goldDim }
                },
                '& .MuiInputBase-input::placeholder': { color: C.textSecondary, opacity: 1 }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: C.textSecondary, fontSize: 18 }} />
                  </InputAdornment>
                )
              }}
            />
          )}

          {isFirstLoad && isLoading ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" height={40} sx={{ bgcolor: '#151515', borderRadius: '8px', flex: 1 }} />
              <Skeleton variant="rectangular" height={40} sx={{ bgcolor: '#151515', borderRadius: '8px', flex: 1 }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ flex: 1, ...selectSx }}>
                <InputLabel>Sexo</InputLabel>
                <Select value={sexoSeleccionado} label="Sexo"
                  onChange={(e) => { setSexoSeleccionado(e.target.value); setCategoriaSeleccionada('todas') }}
                  MenuProps={selectMenuProps}>
                  <MenuItem value="Masculino">Masculino</MenuItem>
                  <MenuItem value="Femenino">Femenino</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1, ...selectSx }}>
                <InputLabel>Categoría</InputLabel>
                <Select value={categoriaSeleccionada} label="Categoría"
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                  MenuProps={selectMenuProps}>
                  <MenuItem value="todas">Todas</MenuItem>
                  {getCategoriasDisponibles().map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        {/* ── CARDS POR CATEGORÍA ── */}
        {isFirstLoad && isLoading ? (
          <Box>
            {[1, 2].map((i) => (
              <Box key={i} sx={{ mb: 6 }}>
                <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: '#181818', mx: 'auto', mb: 3 }} />
                <Box sx={{ backgroundColor: C.surface, borderRadius: '12px', p: 3 }}>
                  <Skeleton variant="text" height={28} sx={{ bgcolor: '#1c1c1c', mb: 1 }} />
                  <Skeleton variant="text" width="50%" height={16} sx={{ bgcolor: '#1c1c1c', mb: 2.5 }} />
                  <Skeleton variant="rectangular" height={60} sx={{ bgcolor: '#1c1c1c', borderRadius: '6px', mb: 2 }} />
                  <Skeleton variant="rectangular" height={36} sx={{ bgcolor: '#1c1c1c', borderRadius: '6px' }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : Object.keys(categoriasAgrupadas).length === 0 ? (
          <Box sx={{ mt: 12, textAlign: 'center' }}>
            <Typography sx={{ color: C.textSecondary, fontSize: '0.9rem' }}>
              No hay atletas para mostrar
            </Typography>
          </Box>
        ) : (
          categoriasOrdenadas.map(([categoria, atletasCat]) => (
            <Box key={categoria} sx={{ mb: 6 }}>
              {/* Título de categoría */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ flex: 1, height: '1px', backgroundColor: C.borderSubtle }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em', color: C.gold, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {categoria}
                </Typography>
                <Box sx={{ flex: 1, height: '1px', backgroundColor: C.borderSubtle }} />
              </Box>

              <Swiper modules={[Pagination]} spaceBetween={16} slidesPerView={1} pagination={{ clickable: true }}>
                {atletasCat.map((atleta, index) => {
                  const tieneSentadillaValida = atleta.valido_s1 === true || atleta.valido_s2 === true || atleta.valido_s3 === true
                  const tieneBancoValido = atleta.valido_b1 === true || atleta.valido_b2 === true || atleta.valido_b3 === true
                  const tienePesoMuertoValido = atleta.valido_d1 === true || atleta.valido_d2 === true || atleta.valido_d3 === true
                  const tieneIntentosValidosCompletos = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido
                  const puesto = index + 1
                  const { borderColor, labelColor, label, glow } = getPuestoConfig(puesto, tieneIntentosValidosCompletos)

                  const lifts = [
                    {
                      label: 'Sentadilla', val: atleta.mejorSentadilla, barColor: '#4a8ac4',
                      validos: [atleta.valido_s1, atleta.valido_s2, atleta.valido_s3],
                      pesos: [atleta.primer_intento_sentadilla, atleta.segundo_intento_sentadilla, atleta.tercer_intento_sentadilla],
                    },
                    {
                      label: 'Press de banco', val: atleta.mejorBanco, barColor: '#c05050',
                      validos: [atleta.valido_b1, atleta.valido_b2, atleta.valido_b3],
                      pesos: [atleta.primer_intento_banco, atleta.segundo_intento_banco, atleta.tercer_intento_banco],
                    },
                    {
                      label: 'Peso muerto', val: atleta.mejorPesoMuerto, barColor: '#4a9a4a',
                      validos: [atleta.valido_d1, atleta.valido_d2, atleta.valido_d3],
                      pesos: [atleta.primer_intento_peso_muerto, atleta.segundo_intento_peso_muerto, atleta.tercer_intento_peso_muerto],
                    },
                  ]
                  const maxLift = Math.max(atleta.mejorSentadilla || 0, atleta.mejorBanco || 0, atleta.mejorPesoMuerto || 0)

                  return (
                    <SwiperSlide key={atleta.id}>
                      <Card elevation={0} sx={{
                        backgroundColor: C.surface,
                        border: `1px solid ${glow ? C.gold + '66' : C.border}`,
                        borderLeft: `3px solid ${borderColor}`,
                        borderRadius: '12px',
                        color: C.textPrimary,
                        overflow: 'hidden',
                        ...(glow && {
                          boxShadow: `0 0 18px 2px ${C.gold}22`,
                          animation: 'goldGlow 2.5s ease-in-out infinite',
                          '@keyframes goldGlow': {
                            '0%,100%': { boxShadow: `0 0 12px 1px ${C.gold}18` },
                            '50%': { boxShadow: `0 0 28px 6px ${C.gold}40` },
                          }
                        })
                      }}>
                        <CardContent sx={{ p: 2.5, pb: '20px !important' }}>

                          {/* Cabecera: posición + datos secundarios */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.75 }}>
                            <Box sx={{
                              px: 1.5, py: 0.5,
                              backgroundColor: `${borderColor}18`,
                              border: `1px solid ${borderColor}55`,
                              borderRadius: '6px'
                            }}>
                              <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, color: labelColor, letterSpacing: '0.08em' }}>
                                {label}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.9rem', color: C.textSecondary }}>
                              {atleta.peso_corporal} kg · {atleta.edad || '—'} años
                            </Typography>
                          </Box>

                          {/* Nombre */}
                          <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: C.textPrimary, lineHeight: 1.2, mb: 0.3 }}>
                            {atleta.nombre} {atleta.apellido}
                          </Typography>
                          <Typography sx={{ fontSize: '0.9rem', color: C.textSecondary, mb: 2.25 }}>
                            {atleta.categoria} · {atleta.modalidad}
                          </Typography>

                          <Divider sx={{ borderColor: C.borderSubtle, mb: 2 }} />

                          {/* Levantamientos — 3 columnas */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {lifts.map(({ label: liftLabel, val, barColor, validos, pesos }) => (
                              <Box key={liftLabel} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                                <Typography sx={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 500, textAlign: 'center', letterSpacing: '0.02em' }}>
                                  {liftLabel}
                                </Typography>
                                <Box sx={{
                                  height: 12, borderRadius: '4px',
                                  backgroundColor: val ? barColor : '#1e1e1e',
                                  border: val ? `1px solid ${barColor}99` : '1px solid #2a2a2a',
                                  transition: 'background-color 0.3s ease',
                                }} />
                                <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: val ? '#e0e0e0' : C.textMuted, textAlign: 'center', lineHeight: 1.1 }}>
                                  {val ? val : '—'}
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: C.textSecondary, textAlign: 'center', mt: -0.3 }}>
                                  {val ? 'kg' : ''}
                                </Typography>
                              </Box>
                            ))}
                          </Box>

                          <Divider sx={{ borderColor: C.borderSubtle, my: 2 }} />

                          {/* Total + DOTS */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2.25 }}>
                            <Box>
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.14em', color: C.textSecondary, textTransform: 'uppercase', mb: 0.4 }}>
                                Total
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                                <Typography sx={{ fontSize: '2.4rem', fontWeight: 900, color: C.textPrimary, lineHeight: 1 }}>
                                  {atleta.total || 0}
                                </Typography>
                                <Typography sx={{ fontSize: '1rem', color: C.textSecondary, fontWeight: 400 }}>kg</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.14em', color: C.textSecondary, textTransform: 'uppercase', mb: 0.4 }}>
                                DOTS
                              </Typography>
                              <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: atleta.dots ? '#aaaaaa' : C.textMuted }}>
                                {atleta.dots ? atleta.dots.toFixed(2) : '—'}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Botón */}
                          <Button
                            fullWidth
                            onClick={() => handleVerMas(atleta)}
                            sx={{
                              py: 1.1, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.04em',
                              color: C.textSecondary, border: `1px solid ${C.border}`,
                              borderRadius: '8px', backgroundColor: 'transparent', textTransform: 'none',
                              transition: 'all 0.15s',
                              '&:hover': { backgroundColor: C.surfaceHover, color: C.textPrimary, borderColor: '#3a3a3a' }
                            }}
                          >
                            Ver detalles
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

        {/* ── MODAL DETALLE ── */}
        <Modal
          open={openModal}
          onClose={() => setOpenModal(false)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
        >
          <Paper sx={{
            maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            backgroundColor: '#0f0f0f',
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            color: C.textPrimary,
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            outline: 'none',
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#222', borderRadius: '4px' }
          }}>
            {atletaSeleccionado && (
              <Box>
                {/* Header del modal */}
                <Box sx={{ px: 3, pt: 3, pb: 2.5, borderBottom: `1px solid ${C.borderSubtle}`, position: 'relative' }}>
                  <IconButton
                    onClick={() => setOpenModal(false)}
                    sx={{
                      position: 'absolute', top: 16, right: 16,
                      color: C.textSecondary, width: 28, height: 28,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      '&:hover': { backgroundColor: C.surfaceHover, color: C.textPrimary }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>

                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: C.textPrimary, pr: 5, lineHeight: 1.2, mb: 0.5 }}>
                    {atletaSeleccionado.nombre} {atletaSeleccionado.apellido}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: C.textSecondary }}>
                    {atletaSeleccionado.categoria} · {atletaSeleccionado.modalidad}
                  </Typography>
                </Box>

                {/* Info del atleta */}
                <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1, borderBottom: `1px solid ${C.borderSubtle}`, flexWrap: 'wrap' }}>
                  {[
                    ['Peso corporal', `${atletaSeleccionado.peso_corporal} kg`],
                    ['Edad', atletaSeleccionado.edad || '—'],
                  ].map(([lbl, val]) => (
                    <Box key={lbl} sx={{ flex: 1, minWidth: 100, backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', px: 1.75, py: 1.25 }}>
                      <Typography sx={{ fontSize: '0.62rem', color: C.textSecondary, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.25 }}>{lbl}</Typography>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: C.textPrimary }}>{val}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Intentos por ejercicio */}
                <Box sx={{ px: 3, py: 2.5 }}>
                  {[
                    { titulo: 'Sentadilla', nombre: 'sentadilla', prefijo: 's', accentColor: '#3a6a9a', mejor: atletaSeleccionado.mejorSentadilla },
                    { titulo: 'Press de banco', nombre: 'banco', prefijo: 'b', accentColor: '#8a3535', mejor: atletaSeleccionado.mejorBanco },
                    { titulo: 'Peso muerto', nombre: 'peso_muerto', prefijo: 'd', accentColor: '#3a6a3a', mejor: atletaSeleccionado.mejorPesoMuerto },
                  ].map(({ titulo, nombre, prefijo, accentColor, mejor }, idx, arr) => (
                    <Box key={titulo} sx={{ mb: idx < arr.length - 1 ? 2.5 : 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 3, height: 14, backgroundColor: accentColor, borderRadius: '2px' }} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#8a8a8a', letterSpacing: '0.04em' }}>
                            {titulo}
                          </Typography>
                        </Box>
                        {mejor > 0 && (
                          <Typography sx={{ fontSize: '0.72rem', color: C.textSecondary }}>
                            Mejor: <Typography component="span" sx={{ fontWeight: 700, color: '#6a6a6a' }}>{mejor} kg</Typography>
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {[1, 2, 3].map((num) => {
                          const nombreIntento = num === 1 ? 'primer' : num === 2 ? 'segundo' : 'tercer'
                          const peso = atletaSeleccionado[`${nombreIntento}_intento_${nombre}`]
                          const valido = atletaSeleccionado[`valido_${prefijo}${num}`]

                          const bgColor = valido === true ? '#0c1f14' : valido === false ? '#1f0c0c' : C.surface
                          const borderClr = valido === true ? '#1a3a24' : valido === false ? '#3a1a1a' : C.border
                          const weightColor = valido === true ? '#4ade80' : valido === false ? '#f87171' : '#4a4a4a'
                          const statusIcon = valido === true ? '✓' : valido === false ? '✗' : '·'
                          const statusColor = valido === true ? '#4ade80' : valido === false ? '#f87171' : C.textMuted

                          return (
                            <Box key={num} sx={{
                              flex: 1, px: 1.25, py: 1.25,
                              backgroundColor: bgColor,
                              border: `1px solid ${borderClr}`,
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <Typography sx={{ fontSize: '0.58rem', color: C.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}>
                                {num}°
                              </Typography>
                              <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: weightColor, lineHeight: 1.1 }}>
                                {peso || '—'}
                              </Typography>
                              {peso && (
                                <Typography sx={{ fontSize: '0.6rem', color: '#3a3a3a' }}>kg</Typography>
                              )}
                              <Typography sx={{ fontSize: '0.7rem', color: statusColor, mt: 0.5, lineHeight: 1 }}>
                                {statusIcon}
                              </Typography>
                            </Box>
                          )
                        })}
                      </Box>

                      {idx < arr.length - 1 && (
                        <Divider sx={{ borderColor: C.borderSubtle, mt: 2.5 }} />
                      )}
                    </Box>
                  ))}
                </Box>

                {/* Total + DOTS */}
                <Box sx={{
                  mx: 3, mb: 3, p: 2.5,
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', color: C.textSecondary, textTransform: 'uppercase', mb: 0.5 }}>
                      Total
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>
                        {atletaSeleccionado.total || 0}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: C.textSecondary }}>kg</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '1px', height: 40, backgroundColor: C.border }} />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', color: C.textSecondary, textTransform: 'uppercase', mb: 0.5 }}>
                      DOTS
                    </Typography>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: atletaSeleccionado.dots ? '#5a5a5a' : C.textMuted, lineHeight: 1 }}>
                      {atletaSeleccionado.dots ? atletaSeleccionado.dots.toFixed(2) : '—'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Modal>

      </Box>
    </Box>
  )
}
