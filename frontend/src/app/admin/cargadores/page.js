'use client'

import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import {
  Box, Typography, Paper, FormControl, InputLabel,
  Select, MenuItem, useMediaQuery, useTheme,
  Button, Stack, CircularProgress, Divider, Chip,
  TextField, LinearProgress, IconButton, Tooltip,
} from '@mui/material'
import { PlayArrow as PlayArrowIcon, Pause as PauseIcon, Check as CheckIcon, RestartAlt as RestartAltIcon, FitnessCenter as FitnessCenterIcon, Close as CloseIcon } from '@mui/icons-material'
import { toast } from 'react-toastify'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { DeleteGenericModal } from '../../../components/modales/DeleteGenericModal'
import { useGridApiContext } from '@mui/x-data-grid'
import { supabase, fetchAtletasConIntentos } from '../../../lib/supabaseClient'
import { joinCompetenciaLive } from '../../../lib/competenciaLive'
import { apiFetch } from '../../../lib/api'
import { capitalizeWords } from '../../../utils/textUtils'
import { colorCategoria } from '../../../utils/colorCategoria'
import { useDarkMode } from '../../../context/ThemeContext'
import categorias, { claveCategoriaPlataforma } from '../../../const/categorias/categorias'
import { TANDA_IDS, letraTanda } from '../../../const/tandas'

// ── Helpers puros a nivel módulo (refs estables -> columns memoizable) ──
const MOVIMIENTO_MAP = { sentadilla: 1, banco: 2, peso_muerto: 3 }
// 1–30: rack abierto. 31–60: la misma posición con el rack cerrado (1C–30C).
const ALTURAS_RACK = Array.from({ length: 60 }, (_, index) => index + 1)
const formatearAlturaRack = (altura) => Number(altura) > 30 ? `${Number(altura) - 30}C` : altura
const PESO_FIELDS = {
  sentadilla: ['primer_intento_sentadilla', 'segundo_intento_sentadilla', 'tercer_intento_sentadilla'],
  banco: ['primer_intento_banco', 'segundo_intento_banco', 'tercer_intento_banco'],
  peso_muerto: ['primer_intento_peso_muerto', 'segundo_intento_peso_muerto', 'tercer_intento_peso_muerto'],
}
const VALIDO_FIELDS = {
  sentadilla: ['valido_s1', 'valido_s2', 'valido_s3'],
  banco: ['valido_b1', 'valido_b2', 'valido_b3'],
  peso_muerto: ['valido_d1', 'valido_d2', 'valido_d3'],
}
const SOLICITUDES_PESO_STORAGE_KEY = 'power-space:solicitudes-proximo-peso'
const CONTEXTO_ORDEN_CARGADORES_STORAGE_KEY = 'power-space:contexto-orden-cargadores'

// Muestra hasta diez alturas y habilita scroll para las restantes. Se usa un
// editor propio para que la columna Rack no despliegue una lista interminable.
function RackSelectEditCell({ id, field, value }) {
  const apiRef = useGridApiContext()

  const commit = async (newValue) => {
    await apiRef.current.setEditCellValue({ id, field, value: Number(newValue) })
    apiRef.current.stopCellEditMode({ id, field })
  }

  return (
    <Select
      value={value ?? ''}
      onChange={(event) => commit(event.target.value)}
      onClose={() => apiRef.current.stopCellEditMode({ id, field })}
      open
      autoFocus
      fullWidth
      MenuProps={{ PaperProps: { style: { maxHeight: 48 * 10.5 } } }}
      sx={{ height: '100%' }}
    >
      {ALTURAS_RACK.map((altura) => (
        <MenuItem key={altura} value={altura}>{formatearAlturaRack(altura)}</MenuItem>
      ))}
    </Select>
  )
}

function calcularDiscos(pesoTotal) {
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

function obtenerPesoSegunEjercicio(atleta, ejercicio, numeroIntento = 1) {
  if (!atleta) return 0
  const campos = PESO_FIELDS[ejercicio]
  if (!campos) return 0
  return atleta[campos[numeroIntento - 1]] || 0
}

function obtenerValidoSegunEjercicio(atleta, ejercicio, numeroIntento = 1) {
  if (!atleta) return null
  const campos = VALIDO_FIELDS[ejercicio]
  if (!campos) return null
  return atleta[campos[numeroIntento - 1]]
}

function getMejorIntento(atleta, ejercicio) {
  if (!atleta) return null
  let mejorNumero = null
  let mejorPeso = 0
  for (let n = 1; n <= 3; n++) {
    const peso = obtenerPesoSegunEjercicio(atleta, ejercicio, n)
    const valido = obtenerValidoSegunEjercicio(atleta, ejercicio, n)
    if (peso && valido === true && peso > mejorPeso) { mejorPeso = peso; mejorNumero = n }
  }
  return mejorNumero
}

// Mismo esquema de color que columnsIntentos.js (renderIntentoCell): válido -> verde
// (más claro si es el mejor), nulo -> rojo tachado, sin juzgar -> gris neutro.
function renderIntentoCellCargadores(atleta, ejercicio, numero) {
  const peso = obtenerPesoSegunEjercicio(atleta, ejercicio, numero)
  const valido = obtenerValidoSegunEjercicio(atleta, ejercicio, numero)
  const esMejor = getMejorIntento(atleta, ejercicio) === numero

  if (!peso && peso !== 0) return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(128, 128, 128, 0.15)' }}>
      -
    </Box>
  )

  const bgcolor = valido === true ? (esMejor ? '#66bb6a' : '#2e7d32')
    : valido === false ? '#c62828'
    : 'rgba(128, 128, 128, 0.15)'
  const juzgado = valido === true || valido === false

  return (
    <Box sx={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor, color: juzgado ? '#fff' : 'inherit', fontWeight: juzgado ? 'bold' : 'normal',
      textDecoration: valido === false ? 'line-through' : 'none',
    }}>
      {peso} kg
    </Box>
  )
}

// Mejor levantamiento válido (misma lógica que el backend getAtletasConIntentos).
function mejorLevantamiento(atleta, ejercicio) {
  const pf = PESO_FIELDS[ejercicio], vf = VALIDO_FIELDS[ejercicio]
  const p1 = atleta[pf[0]], p2 = atleta[pf[1]], p3 = atleta[pf[2]]
  return Math.max(
    (p1 && atleta[vf[0]] !== false) ? p1 : 0,
    (p2 && atleta[vf[1]]) ? p2 : 0,
    (p3 && atleta[vf[2]]) ? p3 : 0,
  )
}

function calcularTotal(atleta) {
  const t = mejorLevantamiento(atleta, 'sentadilla') + mejorLevantamiento(atleta, 'banco') + mejorLevantamiento(atleta, 'peso_muerto')
  return t > 0 ? t : null
}

// Aplica un cambio de intento local y recalcula total (update optimista).
function aplicarIntentoLocal(atleta, ejercicio, intentoNum, peso, valido) {
  const pesoField = PESO_FIELDS[ejercicio][intentoNum - 1]
  const validoField = VALIDO_FIELDS[ejercicio][intentoNum - 1]
  const actualizado = { ...atleta, [pesoField]: peso ?? null, [validoField]: valido ?? null }
  actualizado.total = calcularTotal(actualizado)
  return actualizado
}

// Cronómetro aislado: el tick de 1s vive acá y NO re-renderiza el page/grid.
// Antes el setInterval estaba en CargadoresPage y disparaba un re-render completo
// (columns, rows, tinteRowSx, DataGrid) cada segundo.
const Cronometro = memo(function Cronometro({ corriendo, tiempoInicial, onExpire }) {
  const [segundos, setSegundos] = useState(tiempoInicial ?? 60)
  const intervalRef = useRef(null)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }

    if (!corriendo) { setSegundos(tiempoInicial ?? 60); return }

    let s = tiempoInicial ?? 60
    setSegundos(s)
    intervalRef.current = setInterval(() => {
      s -= 1
      setSegundos(Math.max(0, s))
      if (s <= 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        onExpireRef.current?.()
      }
    }, 1000)

    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [corriendo, tiempoInicial])

  return (
    <Typography sx={{
      minWidth: 56, textAlign: 'center', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1,
      color: !corriendo ? 'text.disabled' : segundos <= 10 ? '#ff1744' : '#00e676',
    }}>
      {segundos}s
    </Typography>
  )
})

// Tarjeta no bloqueante para definir el próximo peso. Cada tarjeta administra su propio
// timer para que el tick de 1s no vuelva a renderizar la página ni la grilla completa.
const TarjetaProximoPeso = memo(function TarjetaProximoPeso({ data, onConfirm, onDismiss, isDark }) {
  const [valor, setValor] = useState(String(data.pesoSugerido ?? ''))
  const [segundos, setSegundos] = useState(() =>
    Math.max(0, Math.ceil(((data.venceEn ?? Date.now() + 60000) - Date.now()) / 1000))
  )
  const intervalRef = useRef(null)
  const venceEnRef = useRef(data.venceEn ?? Date.now() + 60000)
  const dataRef = useRef(data)
  dataRef.current = data
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setValor(String(dataRef.current.pesoSugerido ?? ''))
    const calcularRestante = () =>
      Math.max(0, Math.ceil((venceEnRef.current - Date.now()) / 1000))
    let s = calcularRestante()
    setSegundos(s)
    if (s <= 0) {
      const d = dataRef.current
      if (d) onConfirmRef.current?.(d, d.pesoSugerido)
      return
    }
    intervalRef.current = setInterval(() => {
      s = calcularRestante()
      setSegundos(Math.max(0, s))
      if (s <= 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        const d = dataRef.current
        if (d) onConfirmRef.current?.(d, d.pesoSugerido)
      }
    }, 1000)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [data.id])

  const color = data.ejercicioColor || '#ff6b35'
  const urgente = segundos <= 10
  const progreso = (segundos / 60) * 100
  const pesoIngresado = parseFloat(valor)
  const pesoMinimo = parseFloat(data.pesoActual) || 0
  const pesoPermitido = !isNaN(pesoIngresado) && pesoIngresado >= pesoMinimo
  const masDosCinco = () => setValor(String(Math.max(parseFloat(valor) || pesoMinimo, pesoMinimo) + 2.5))
  const confirmar = () => {
    const n = parseFloat(valor)
    const d = dataRef.current
    if (d && !isNaN(n) && n >= pesoMinimo) onConfirm(d, n)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative', flex: '0 0 auto', width: { xs: 330, md: 390 }, height: 66,
        display: 'flex', alignItems: 'center', gap: 1, px: 1.25, pb: 0.5,
        border: `1px solid ${urgente ? '#ff1744' : (isDark ? '#424242' : '#dedede')}`,
        borderRadius: 0.75, overflow: 'hidden',
        bgcolor: isDark ? '#202020' : '#fff',
        transition: 'border-color .2s ease',
      }}
    >
      <Box sx={{ minWidth: 112, maxWidth: 132, overflow: 'hidden' }}>
        <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 900, lineHeight: 1.1 }}>
          {capitalizeWords(data.atletaNombre)}
        </Typography>
        <Typography noWrap sx={{ mt: 0.35, fontSize: '0.68rem', color: 'text.secondary', fontWeight: 700 }}>
          <Box component="span" sx={{ color: data.valido ? '#43a047' : '#ef5350' }}>
            {data.valido ? 'Válido' : 'Nulo'}
          </Box>
          {' · '}{data.proximoIntento}° intento · actual {data.pesoActual} kg
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
        <TextField
          type="text" value={valor} size="small"
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') confirmar() }}
          error={!pesoPermitido}
          inputProps={{ 'aria-label': `Próximo peso de ${data.atletaNombre}`, inputMode: 'decimal' }}
          sx={{
            width: 72,
            '& .MuiInputBase-root': { height: 34, borderRadius: 1.5 },
            '& input': { p: '7px 6px', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem' },
          }}
        />
        <Button
          variant="outlined" onClick={masDosCinco}
          sx={{ minWidth: 44, height: 34, px: 0.5, borderColor: color, color, fontSize: '0.68rem', fontWeight: 900 }}
        >
          +2.5
        </Button>
        <Button
          variant="contained" onClick={confirmar} disabled={!pesoPermitido}
          aria-label={`Confirmar próximo peso de ${data.atletaNombre}`}
          sx={{ minWidth: 36, width: 36, height: 34, p: 0, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(.9)' } }}
        >
          <CheckIcon fontSize="small" />
        </Button>
      </Stack>

      <Typography
        aria-label={`${segundos} segundos restantes`}
        sx={{ width: 30, textAlign: 'right', fontSize: '0.72rem', fontWeight: 900, color: urgente ? '#ff1744' : 'text.secondary' }}
      >
        {segundos}s
      </Typography>
      <Tooltip title="Descartar solicitud">
        <IconButton
          size="small" onClick={() => onDismiss(data.id)}
          aria-label={`Descartar próximo peso de ${data.atletaNombre}`}
          sx={{ position: 'absolute', top: -3, right: -3, p: 0.25, color: 'text.disabled' }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>

      <LinearProgress
        variant="determinate" value={progreso}
        sx={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, bgcolor: isDark ? '#343434' : '#eceff1',
          '& .MuiLinearProgress-bar': { bgcolor: urgente ? '#ff1744' : color, transition: 'transform 1s linear' },
        }}
      />
    </Paper>
  )
})

export default function CargadoresPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  // pantalla angosta: la tabla compite con el panel 52vw, no entran todas las columnas
  const isTableCramped = useMediaQuery('(max-width:1300px)')
  const { isDark } = useDarkMode()

  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border  = isDark ? '#3a3a3a' : '#e0e0e0'

  const [atletas, setAtletas] = useState([])
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null)
  const [ejercicioFiltro, setEjercicioFiltro] = useState('sentadilla')
  const [tandaFiltro, setTandaFiltro] = useState(1)
  const [pesoFiltro, setPesoFiltro] = useState('todos')
  const [intentoSeleccionado, setIntentoSeleccionado] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [restableciendoCompetencia, setRestableciendoCompetencia] = useState(false)
  const [modalRestablecerAbierto, setModalRestablecerAbierto] = useState(false)
  const [estadoJueces, setEstadoJueces] = useState(null)
  const [sortModel, setSortModel] = useState([])
  const [solicitudesPeso, setSolicitudesPeso] = useState([])
  const [solicitudesHidratadas, setSolicitudesHidratadas] = useState(false)
  // Clave (atleta_id-intento) de la última tentativa auto-marcada. Evita re-marcar la
  // misma tentativa cuando los echoes de postgres_changes replayan los votos de a uno
  // después del fast-path (causaba el modal "próximo peso" reabriéndose solo).
  const marcadoClaveRef = useRef(null)
  const liveRef = useRef(null)
  const ordenTandaRef = useRef(null)
  // Una selección manual se refleja de forma optimista. Mientras su POST sigue
  // pendiente, no permitimos que un echo autoritativo de un clic anterior vuelva
  // a mover el panel lateral al atleta viejo.
  const seleccionLocalRef = useRef({ token: 0, atletaId: null, pendiente: false })

  // Las solicitudes sobreviven recargas y cierres del navegador. Se guarda el timestamp
  // de vencimiento para continuar el timer real, sin regalar otros 60s al recargar.
  useEffect(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem(SOLICITUDES_PESO_STORAGE_KEY) || '[]')
      if (Array.isArray(guardadas)) setSolicitudesPeso(guardadas)
    } catch (err) {
      console.error('No se pudieron restaurar los próximos pesos:', err)
    } finally {
      setSolicitudesHidratadas(true)
    }
  }, [])

  useEffect(() => {
    if (!solicitudesHidratadas) return
    try {
      localStorage.setItem(SOLICITUDES_PESO_STORAGE_KEY, JSON.stringify(solicitudesPeso))
    } catch (err) {
      console.error('No se pudieron guardar los próximos pesos:', err)
    }
  }, [solicitudesPeso, solicitudesHidratadas])

  const fetchAtletas = useCallback(async () => {
    setIsLoading(true)
    try {
      // Lectura directa desde la view (sin hop por Express).
      const data = await fetchAtletasConIntentos({ tandaId: tandaFiltro })
      setAtletas(data)
      // Evita que el panel lateral conserve una copia vieja cuando otro
      // cargador modifica el mismo intento.
      setAtletaSeleccionado(prev => prev
        ? data.find(atleta => atleta.id === prev.id) || prev
        : prev
      )
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tandaFiltro])

  useEffect(() => { fetchAtletas() }, [fetchAtletas])

  // Mantiene sincronizadas varias pantallas sin recargar la grilla completa
  // al juzgar un intento. INSERT/UPDATE cambian solamente la fila afectada;
  // DELETE sí reconcilia toda la lista porque puede dejar campos vacíos.
  useEffect(() => {
    const patchIntento = (intento) => {
      const ejercicio = Object.entries(MOVIMIENTO_MAP)
        .find(([, movimientoId]) => movimientoId === Number(intento?.movimiento_id))?.[0]
      const numero = Number(intento?.intento_numero)
      if (!ejercicio || ![1, 2, 3].includes(numero)) return

      const aplicarPatch = (atleta) => Number(atleta.id) === Number(intento.atleta_id)
        ? aplicarIntentoLocal(atleta, ejercicio, numero, intento.peso, intento.valido)
        : atleta
      setAtletas(prev => prev.map(aplicarPatch))
      setAtletaSeleccionado(prev => Number(prev?.id) === Number(intento.atleta_id) ? aplicarPatch(prev) : prev)
    }
    const channel = supabase
      .channel('admin:cargadores_intentos_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'intentos' }, (payload) => patchIntento(payload.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'intentos' }, (payload) => patchIntento(payload.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'intentos' }, fetchAtletas)
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime de cargadores no disponible:', error || status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAtletas])

  // Orden derivado (memo) en vez de state + effect + console.logs.
  // Misma lógica: intento1/2/3 mapean al peso del ejercicio activo; desempate por lot.
  const atletasOrdenados = useMemo(() => {
    if (sortModel.length === 0) return atletas

    const ek = ejercicioFiltro === 'banco' ? 'banco' : ejercicioFiltro === 'peso_muerto' ? 'peso_muerto' : 'sentadilla'
    const { field, sort } = sortModel[0]
    const fieldKey = field === 'intento1' ? `primer_intento_${ek}`
      : field === 'intento2' ? `segundo_intento_${ek}`
      : field === 'intento3' ? `tercer_intento_${ek}`
      : field

    return [...atletas].sort((a, b) => {
      const aValue = a[fieldKey] ?? -Infinity
      const bValue = b[fieldKey] ?? -Infinity
      if (aValue < bValue) return sort === 'asc' ? -1 : 1
      if (aValue > bValue) return sort === 'asc' ? 1 : -1
      const lotA = a.lot ?? Infinity
      const lotB = b.lot ?? Infinity
      if (lotA !== lotB) return lotA - lotB
      return 0
    })
  }, [sortModel, atletas, ejercicioFiltro])

  // Intentos reutiliza esta secuencia para mostrar la misma tanda con el mismo
  // orden que está viendo Cargadores, incluso después de navegar de una pantalla
  // a la otra o si ambas quedaron abiertas en pestañas separadas.
  useEffect(() => {
    if (isLoading || atletas.length === 0 || atletas.some((atleta) => Number(atleta.tanda_id) !== Number(tandaFiltro))) return

    const contextoOrden = {
      tandaId: Number(tandaFiltro),
      atletaIds: atletasOrdenados.map((atleta) => atleta.id),
    }
    ordenTandaRef.current = contextoOrden
    localStorage.setItem(CONTEXTO_ORDEN_CARGADORES_STORAGE_KEY, JSON.stringify(contextoOrden))
    liveRef.current?.ordenarTanda(contextoOrden)
  }, [atletas, atletasOrdenados, tandaFiltro, isLoading])

  useEffect(() => {
    const aplicarEstadoAutoritativo = (estado) => {
      const seleccionLocal = seleccionLocalRef.current
      if (
        seleccionLocal.pendiente
        && seleccionLocal.atletaId !== null
        && Number(estado?.atleta_id) !== Number(seleccionLocal.atletaId)
      ) {
        return
      }
      setEstadoJueces(estado)
    }

    const fetchEstadoInicial = async () => {
      // Lectura directa (sin hop Express)
      const { data } = await supabase.from('estado_competencia').select('*').eq('id', 1).maybeSingle()
      if (data) aplicarEstadoAutoritativo(data)
    }
    fetchEstadoInicial()

    // Autoritativo: reconcilia el estado real
    const channel = supabase
      .channel('public:estado_competencia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        (payload) => { aplicarEstadoAutoritativo(payload.new) }
      )
      .subscribe()

    // Fast-path: votos de jueces al instante -> luces + auto-marcado más rápidos.
    // El merge parcial se reconcilia luego con postgres_changes (idempotente).
    liveRef.current = joinCompetenciaLive((parcial) =>
      setEstadoJueces(prev => prev ? { ...prev, ...parcial } : prev)
    )
    if (ordenTandaRef.current) liveRef.current.ordenarTanda(ordenTandaRef.current)

    return () => { supabase.removeChannel(channel); liveRef.current?.leave() }
  }, [])

  // Si los jueces cierran un intento, el backend adelanta el estado de
  // competencia. Reflejamos esa selección en esta pantalla sin simular un
  // clic ni volver a escribir en la base.
  useEffect(() => {
    const atletaId = estadoJueces?.atleta_id
    if (!atletaId) return
    const atleta = atletas.find((fila) => Number(fila.id) === Number(atletaId))
    if (!atleta) return

    setAtletaSeleccionado(atleta)
    if (['sentadilla', 'banco', 'peso_muerto'].includes(estadoJueces.ejercicio)) {
      setEjercicioFiltro(estadoJueces.ejercicio)
    }
    if ([1, 2, 3].includes(Number(estadoJueces.intento))) {
      setIntentoSeleccionado(Number(estadoJueces.intento))
    }
  }, [estadoJueces?.atleta_id, estadoJueces?.ejercicio, estadoJueces?.intento, atletas])

  // Al llegar a 0 el cronómetro (child), apagar el estado en DB. Una sola escritura,
  // no una por segundo. El page ya no re-renderiza con el tick.
  const handleCronoExpire = useCallback(async () => {
    await supabase.from('estado_competencia')
      .update({ corriendo: false, tiempo_restante: 0, updated_at: new Date() })
      .eq('id', 1)
  }, [])

  // Auto-marcar intento cuando todos los jueces votan.
  useEffect(() => {
    if (!estadoJueces) return

    const votos = [estadoJueces.juez1_valido, estadoJueces.juez2_valido, estadoJueces.juez3_valido]
    const votado = (v) => v !== null && v !== undefined
    const todosVotaron = votos.every(votado)
    const ningunoVoto = votos.every((v) => !votado(v))

    // Ronda nueva: los 3 votos vuelven a null (iniciarCronometro / handleCellClick).
    // Re-armamos para permitir marcar la próxima tentativa (incluido un redo de la misma).
    if (ningunoVoto) marcadoClaveRef.current = null

    if (!todosVotaron) return

    // Clave autoritativa de la tentativa (del estado en DB, no de la selección local).
    // Si ya la marcamos, ignoramos los echoes de postgres_changes que replayan los votos
    // uno a uno tras el fast-path — eso reabría el modal / doble-marcaba.
    const claveIntento = `${estadoJueces.atleta_id}-${estadoJueces.intento}`
    if (marcadoClaveRef.current === claveIntento) return

    marcadoClaveRef.current = claveIntento
    const votosValidos = votos.filter((v) => v === true).length
    marcarIntento(votosValidos >= 2)
  }, [estadoJueces])

  const iniciarCronometro = useCallback(async () => {
    const reset = {
      corriendo: true, tiempo_restante: 60,
      juez1_valido: null, juez2_valido: null, juez3_valido: null,
      juez1_tipo: null, juez2_tipo: null, juez3_tipo: null, intento_valido: null,
    }
    // Optimista local: la propia pantalla del cargador arranca YA (broadcast es self:false
    // y postgres_changes tarda ~180ms+ contra Brasil). postgres_changes reconcilia luego.
    setEstadoJueces(prev => prev ? { ...prev, ...reset } : reset)
    try {
      // Fast-path: las demás pantallas arrancan al instante.
      liveRef.current?.send(reset)
      await apiFetch(`/api/jueces/start`, { method: 'POST' })
    } catch (err) { console.error('Error al iniciar cronómetro:', err) }
  }, [])

  const detenerCronometro = useCallback(async () => {
    liveRef.current?.send({ corriendo: false }) // la vista frena al instante
    await supabase.from('estado_competencia')
      .update({ corriendo: false, updated_at: new Date() })
      .eq('id', 1)
  }, [])

  const marcarIntento = useCallback(async (valido) => {
    if (!atletaSeleccionado) { toast.warning('Selecciona un atleta primero'); return }
    const atletaId = atletaSeleccionado.id
    const peso = obtenerPesoSegunEjercicio(atletaSeleccionado, ejercicioFiltro, intentoSeleccionado)
    // 1) UI instantánea (optimista). peso no cambia -> el resultado es idéntico al del backend, no hace falta refetch.
    setAtletas(prev => prev.map(a => a.id === atletaId
      ? aplicarIntentoLocal(a, ejercicioFiltro, intentoSeleccionado, peso, valido) : a))
    if (valido) toast.success('Intento VÁLIDO registrado')
    else toast.error('Intento NULO registrado')

    // 2) Próximo peso (solo si hay intento siguiente)
    if (intentoSeleccionado < 3) {
      const pesoNum = parseFloat(peso) || 0
      const proximoIntento = intentoSeleccionado + 1
      // Tanto válido como nulo generan una tarjeta. El válido sugiere +2.5 kg;
      // el nulo conserva el mismo peso y permite mantenerlo o aumentarlo, nunca bajarlo.
      const nuevaSolicitud = {
        id: `${atletaId}-${ejercicioFiltro}-${proximoIntento}-${Date.now()}`,
        atletaId,
        atletaNombre: `${atletaSeleccionado.nombre ?? ''} ${atletaSeleccionado.apellido ?? ''}`.trim(),
        ejercicio: ejercicioFiltro,
        ejercicioColor: { sentadilla: '#1976d2', banco: '#d32f2f', peso_muerto: '#388e3c' }[ejercicioFiltro],
        proximoIntento,
        pesoActual: pesoNum,
        pesoSugerido: valido ? pesoNum + 2.5 : pesoNum,
        valido,
        venceEn: Date.now() + 60000,
      }
      setSolicitudesPeso(prev => [
        ...prev.filter(s => !(
          s.atletaId === atletaId &&
          s.ejercicio === ejercicioFiltro &&
          s.proximoIntento === proximoIntento
        )),
        nuevaSolicitud,
      ])
    }

    // 3) Persistir en background (no bloquea la UI)
    try {
      await apiFetch(`/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaId,
          movimiento_id: MOVIMIENTO_MAP[ejercicioFiltro],
          intento_numero: intentoSeleccionado,
          peso,
          valido,
        })
      })
      liveRef.current?.refreshAtletas()
      await detenerCronometro()
    } catch (err) {
      console.error('Error al marcar intento:', err)
      toast.error('Error al registrar el intento')
      fetchAtletas() // reconciliar si falló
    }
  }, [atletaSeleccionado, ejercicioFiltro, intentoSeleccionado, detenerCronometro, fetchAtletas])

  const restablecerIntento = useCallback(async () => {
    if (!atletaSeleccionado) { toast.warning('Selecciona un atleta primero'); return }
    const atletaId = atletaSeleccionado.id
    // Optimista: limpiar solo el atleta afectado sin recargar toda la grilla.
    setAtletas(prev => prev.map(a => a.id === atletaId
      ? aplicarIntentoLocal(a, ejercicioFiltro, intentoSeleccionado, null, null) : a))
    setAtletaSeleccionado(prev => prev?.id === atletaId
      ? aplicarIntentoLocal(prev, ejercicioFiltro, intentoSeleccionado, null, null) : prev)
    toast.info('Intento restablecido')
    try {
      await apiFetch(`/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaId,
          movimiento_id: MOVIMIENTO_MAP[ejercicioFiltro],
          intento_numero: intentoSeleccionado,
          peso: null,
          valido: null,
        })
      })
      liveRef.current?.refreshAtletas()
    } catch (err) {
      console.error('Error al restablecer intento:', err)
      toast.error('Error al restablecer el intento')
      fetchAtletas() // solo reconciliar la lista si la escritura falló
    }
  }, [atletaSeleccionado, ejercicioFiltro, intentoSeleccionado, fetchAtletas])

  const restablecerCompetencia = useCallback(async () => {
    setRestableciendoCompetencia(true)
    try {
      const res = await apiFetch('/api/intentos/restablecer-competencia', { method: 'POST' })
      if (!res.ok) throw new Error('No se pudo restablecer la competencia')
      const data = await res.json()
      setAtletaSeleccionado(null)
      setEstadoJueces(null)
      setSolicitudesPeso([])
      liveRef.current?.refreshAtletas()
      await fetchAtletas()
      setModalRestablecerAbierto(false)
      toast.success(`Competencia restablecida: ${data.intentos_eliminados ?? 0} intentos eliminados`)
    } catch (err) {
      console.error('Error al restablecer la competencia:', err)
      toast.error('No se pudo restablecer la competencia')
    } finally {
      setRestableciendoCompetencia(false)
    }
  }, [fetchAtletas])

  // Rack solo aplica a sentadilla/banco. Optimista + PUT al atleta (mismo
  // patrón que el resto de la página: campo puntual sobre el registro completo).
  const actualizarAlturaRack = useCallback(async (nuevaAltura) => {
    if (!atletaSeleccionado) return
    const campo = ejercicioFiltro === 'sentadilla' ? 'altura_rack_sentadilla'
      : ejercicioFiltro === 'banco' ? 'altura_rack_banco' : null
    if (!campo) return
    const atletaId = atletaSeleccionado.id
    const anterior = atletaSeleccionado[campo]
    setAtletas(prev => prev.map(a => a.id === atletaId ? { ...a, [campo]: nuevaAltura } : a))
    setAtletaSeleccionado(prev => prev?.id === atletaId ? { ...prev, [campo]: nuevaAltura } : prev)
    try {
      // atletaSeleccionado viene de la vista atletas_con_intentos (trae
      // segundo_intento_*/tercer_intento_* calculados que NO existen como
      // columnas en la tabla atletas real) -> nunca spreadear el objeto
      // entero acá, solo los campos que updateAtleta espera.
      const {
        nombre, apellido, dni, fecha_nacimiento, categoria, categoria_edad,
        peso_corporal, modalidad, tanda_id, primer_intento_sentadilla,
        primer_intento_banco, primer_intento_peso_muerto, sexo,
        altura_rack_sentadilla, altura_rack_banco, equipo_id, foto,
      } = atletaSeleccionado
      await apiFetch(`/api/atletas/${atletaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, apellido, dni, fecha_nacimiento, categoria, categoria_edad,
          peso_corporal, modalidad, tanda_id, primer_intento_sentadilla,
          primer_intento_banco, primer_intento_peso_muerto, sexo,
          altura_rack_sentadilla, altura_rack_banco, equipo_id, foto,
          [campo]: nuevaAltura,
        }),
      })
    } catch (err) {
      console.error('Error al actualizar altura de rack:', err)
      toast.error('No se pudo guardar la altura del rack')
      setAtletas(prev => prev.map(a => a.id === atletaId ? { ...a, [campo]: anterior } : a))
      setAtletaSeleccionado(prev => prev?.id === atletaId ? { ...prev, [campo]: anterior } : prev)
    }
  }, [atletaSeleccionado, ejercicioFiltro])

  const descartarSolicitudPeso = useCallback((solicitudId) => {
    setSolicitudesPeso(prev => prev.filter(s => s.id !== solicitudId))
  }, [])

  // Asigna el peso del intento siguiente (confirmado o automático por timeout).
  const asignarProximoPeso = useCallback(async (atletaId, ejercicio, proximoIntento, nuevoPeso, solicitudId = null) => {
    if (solicitudId) setSolicitudesPeso(prev => prev.filter(s => s.id !== solicitudId))
    const n = parseFloat(nuevoPeso)
    if (isNaN(n) || n <= 0) return
    // Optimista: cargar el peso del próximo intento (sin validar todavía).
    setAtletas(prev => prev.map(a => a.id === atletaId
      ? aplicarIntentoLocal(a, ejercicio, proximoIntento, n, null) : a))
    toast.info(`${proximoIntento}° intento: ${n} kg`)
    try {
      await apiFetch(`/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atleta_id: atletaId,
          movimiento_id: MOVIMIENTO_MAP[ejercicio],
          intento_numero: proximoIntento,
          peso: n,
          valido: null,
        })
      })
      liveRef.current?.refreshAtletas()
    } catch (err) { console.error('Error al asignar próximo peso:', err); fetchAtletas() }
  }, [fetchAtletas])

  const confirmarSolicitudPeso = useCallback((solicitud, nuevoPeso) => {
    asignarProximoPeso(
      solicitud.atletaId,
      solicitud.ejercicio,
      solicitud.proximoIntento,
      nuevoPeso,
      solicitud.id,
    )
  }, [asignarProximoPeso])

  const handleCellClick = useCallback(async (params) => {
    // El rack se ajusta directamente en su columna; no debe enviar al atleta
    // a la plataforma ni alterar el estado visible para jueces/espectadores.
    if (params.field === 'rack') {
      if (ejercicioFiltro !== 'peso_muerto') {
        params.api.startCellEditMode({ id: params.id, field: params.field })
      }
      return
    }

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

    const tokenSeleccion = seleccionLocalRef.current.token + 1
    seleccionLocalRef.current = {
      token: tokenSeleccion,
      atletaId: params.row.id,
      pendiente: true,
    }
    setAtletaSeleccionado(params.row)
    setIntentoSeleccionado(intento)

    const atletasVista = pesoFiltro === 'todos' ? atletasOrdenados : atletasOrdenados.filter(a => a.categoria === pesoFiltro)
    const indiceActual = atletasVista.findIndex(a => a.id === params.row.id)
    const ordenProximos = indiceActual !== -1 ? atletasVista.slice(indiceActual + 1).map(a => a.id) : []

    const nuevoEstado = {
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
    }
    // La fila activa depende de estadoJueces. Actualizar la pantalla que
    // originó el clic evita esperar el POST + postgres_changes; el broadcast
    // usa self:false y por diseño solo adelanta las demás pantallas.
    setEstadoJueces(prev => ({ ...prev, ...nuevoEstado }))

    // Fast-path: las demás vistas muestran el nuevo atleta/peso al instante.
    liveRef.current?.send(nuevoEstado)
    liveRef.current?.presentarAtleta({
      atleta_id: nuevoEstado.atleta_id,
      atleta_nombre: nuevoEstado.atleta_nombre,
      atleta_apellido: nuevoEstado.atleta_apellido,
      atleta_foto: params.row.foto || null,
      equipo_nombre: params.row.equipo_nombre || null,
      equipo_color: params.row.equipo_color || '#FFA500',
      equipo_foto: params.row.equipo_foto || null,
      coach_nombre: params.row.equipo_coach_nombre || null,
      coach_foto: params.row.equipo_coach_foto || null,
      ficha_completa: true,
    })

    try {
      await apiFetch('/api/jueces/atleta-actual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEstado),
      })
    } catch (error) {
      console.error('Error al actualizar atleta actual:', error)
    } finally {
      // Una respuesta vieja nunca debe dar por terminada una selección más nueva.
      if (seleccionLocalRef.current.token === tokenSeleccion) {
        seleccionLocalRef.current = {
          ...seleccionLocalRef.current,
          pendiente: false,
        }
      }
    }
  }, [pesoFiltro, atletasOrdenados, ejercicioFiltro])

  const processRowUpdate = useCallback(async (newRow, oldRow) => {
    try {
      const ek = ejercicioFiltro === 'banco' ? 'banco' : ejercicioFiltro === 'peso_muerto' ? 'peso_muerto' : 'sentadilla'
      const rackField = ejercicioFiltro === 'sentadilla' ? 'altura_rack_sentadilla'
        : ejercicioFiltro === 'banco' ? 'altura_rack_banco' : null
      const rackCambio = rackField && newRow[rackField] !== oldRow[rackField]

      if (rackCambio) {
        const altura = Number(newRow[rackField])
        if (!Number.isInteger(altura) || altura < 1 || altura > 60) {
          throw new Error('La altura del rack debe ser una posición entre 1 y 30, abierta o cerrada')
        }
        const res = await apiFetch(`/api/atletas/${newRow.id}/rack`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ejercicio: ejercicioFiltro, altura }),
        })
        if (!res.ok) throw new Error('No se pudo guardar la altura del rack')

        setAtletas(prev => prev.map(a => a.id === newRow.id ? { ...a, [rackField]: altura } : a))
        setAtletaSeleccionado(prev => prev?.id === newRow.id ? { ...prev, [rackField]: altura } : prev)
      }

      const campos = PESO_FIELDS[ek]
      const cambios = []
      for (let i = 0; i < 3; i++) {
        const campo = campos[i]
        if (newRow[campo] !== oldRow[campo] && newRow[campo] != null && newRow[campo] !== '')
          cambios.push({ atleta_id: newRow.id, movimiento_id: MOVIMIENTO_MAP[ejercicioFiltro], intento_numero: i + 1, peso: parseFloat(newRow[campo]), valido: null })
      }
      if (cambios.length === 0) return newRow

      // Optimista: aplicar localmente (peso no-null -> idéntico al backend, sin refetch bloqueante)
      setAtletas(prev => prev.map(a => {
        if (a.id !== newRow.id) return a
        let upd = a
        for (const c of cambios) upd = aplicarIntentoLocal(upd, ejercicioFiltro, c.intento_numero, c.peso, null)
        return upd
      }))

      // Persistir en background
      apiFetch(`/api/intentos/upsert-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentos: cambios })
      })
        .then(() => liveRef.current?.refreshAtletas())
        .catch(err => { console.error('Error al actualizar peso:', err); fetchAtletas() })

      return newRow
    } catch (err) { console.error('Error al actualizar peso:', err); return oldRow }
  }, [ejercicioFiltro, fetchAtletas])

  const handleProcessRowUpdateError = useCallback((error) => { console.error('Error al procesar actualización:', error) }, [])

  // Memoizado: solo se reconstruye al cambiar de ejercicio, no en cada render/tick.
  const columns = useMemo(() => [
    {
      field: 'lot', headerName: 'Lot', flex: 0.04, minWidth: 60,
      align: 'center', headerAlign: 'center', type: 'number',
      renderCell: (params) => params.value ?? '-',
    },
    {
      field: 'apellido', headerName: 'Apellido', flex: 0.06, minWidth: 100,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => capitalizeWords(params.value),
    },
    {
      field: 'rack', headerName: 'Rack', flex: 0.04, minWidth: 76,
      align: 'center', headerAlign: 'center', type: 'singleSelect',
      editable: ejercicioFiltro !== 'peso_muerto',
      valueOptions: ALTURAS_RACK,
      valueFormatter: (value) => value == null ? '' : formatearAlturaRack(value),
      valueGetter: (value, row) => ejercicioFiltro === 'sentadilla'
        ? row.altura_rack_sentadilla ?? null
        : ejercicioFiltro === 'banco' ? row.altura_rack_banco ?? null : null,
      valueSetter: (value, row) => {
        const field = ejercicioFiltro === 'sentadilla' ? 'altura_rack_sentadilla'
          : ejercicioFiltro === 'banco' ? 'altura_rack_banco' : null
        return field ? { ...row, [field]: value } : row
      },
      renderCell: (params) => ejercicioFiltro === 'peso_muerto'
        ? '—'
        : params.value == null ? '—' : formatearAlturaRack(params.value),
      renderEditCell: (params) => <RackSelectEditCell {...params} />,
    },
    {
      field: 'categoria', headerName: 'Categoría', flex: 0.07, minWidth: 150,
      align: 'center', headerAlign: 'center',
      valueGetter: (value, row) => claveCategoriaPlataforma(row),
    },
    {
      field: 'intento1', headerName: '1°', flex: 0.06, minWidth: 80,
      align: 'center', headerAlign: 'center', editable: true, type: 'number',
      cellClassName: 'full-bleed-cell',
      valueGetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`primer_intento_${ek}`] || null
      },
      valueSetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`primer_intento_${ek}`]: value }
      },
      renderCell: (params) => renderIntentoCellCargadores(params.row, ejercicioFiltro, 1),
    },
    {
      field: 'intento2', headerName: '2°', flex: 0.06, minWidth: 80,
      align: 'center', headerAlign: 'center', editable: true, type: 'number',
      cellClassName: 'full-bleed-cell',
      valueGetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`segundo_intento_${ek}`] || null
      },
      valueSetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`segundo_intento_${ek}`]: value }
      },
      renderCell: (params) => renderIntentoCellCargadores(params.row, ejercicioFiltro, 2),
    },
    {
      field: 'intento3', headerName: '3°', flex: 0.06, minWidth: 80,
      align: 'center', headerAlign: 'center', editable: true, type: 'number',
      cellClassName: 'full-bleed-cell',
      valueGetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return row[`tercer_intento_${ek}`] || null
      },
      valueSetter: (value, row) => {
        const ek = ejercicioFiltro === 'sentadilla' ? 'sentadilla' : ejercicioFiltro === 'banco' ? 'banco' : 'peso_muerto'
        return { ...row, [`tercer_intento_${ek}`]: value }
      },
      renderCell: (params) => renderIntentoCellCargadores(params.row, ejercicioFiltro, 3),
    },
  ], [ejercicioFiltro])

  const pesoActual = atletaSeleccionado
    ? obtenerPesoSegunEjercicio(atletaSeleccionado, ejercicioFiltro, intentoSeleccionado)
    : 0
  const { discos } = calcularDiscos(pesoActual)

  const ejercicioLabel = { sentadilla: 'Sentadilla', banco: 'Banco', peso_muerto: 'Peso Muerto' }[ejercicioFiltro]
  const ejercicioColor = { sentadilla: '#1976d2', banco: '#d32f2f', peso_muerto: '#388e3c' }[ejercicioFiltro]

  const todasLasCategorias = [...categorias.M, ...categorias.F]
  const atletasMostrados = useMemo(() => pesoFiltro === 'todos'
    ? atletasOrdenados
    : atletasOrdenados.filter(a => a.categoria === pesoFiltro), [atletasOrdenados, pesoFiltro])

  // Tarea 8: cada fila se pinta con el color de su categoria (un solo color por fila),
  // asi se identifica quien compite con quien.
  const categoriasEnTanda = useMemo(
    () => [...new Set(atletasMostrados.map(claveCategoriaPlataforma).filter(Boolean))],
    [atletasMostrados]
  )
  const tinteRowSx = useMemo(() => categoriasEnTanda.reduce((acc, cat, i) => {
    const color = `${colorCategoria(cat)}59` // mismo color de la categoria, ~35% alpha
    acc[`& .MuiDataGrid-row.catgrp-${i}`] = {
      backgroundColor: color,
      '&:hover': { backgroundColor: color },
    }
    return acc
  }, {
    '@keyframes atleta-activo-pulso': {
      '0%, 100%': { backgroundColor: 'rgba(255, 193, 7, .10)', filter: 'brightness(1)' },
      '50%': { backgroundColor: 'rgba(255, 215, 64, .32)', filter: 'brightness(1.05)' },
    },
    // Dorado suave para identificar plataforma sin ocultar los colores de
    // válido/nulo de las celdas de intentos.
    '& .MuiDataGrid-row.atleta-activo': {
      position: 'relative',
      zIndex: 1,
      animation: 'atleta-activo-pulso 1.8s ease-in-out infinite',
    },
    '& .MuiDataGrid-row.atleta-activo .MuiDataGrid-cell:not(.full-bleed-cell)': {
      backgroundColor: 'rgba(255, 193, 7, .14)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      '& .MuiDataGrid-row.atleta-activo': { animation: 'none' },
    },
  }), [categoriasEnTanda])
  const getRowClassNameCategoria = useCallback((params) => {
    const i = categoriasEnTanda.indexOf(claveCategoriaPlataforma(params.row))
    const categoriaClass = i >= 0 ? `catgrp-${i}` : ''
    const activaClass = Number(params.row.id) === Number(estadoJueces?.atleta_id) ? 'atleta-activo' : ''
    return `${categoriaClass} ${activaClass}`.trim()
  }, [categoriasEnTanda, estadoJueces?.atleta_id])

  const todosVotaron =
    estadoJueces?.juez1_valido !== null && estadoJueces?.juez1_valido !== undefined &&
    estadoJueces?.juez2_valido !== null && estadoJueces?.juez2_valido !== undefined &&
    estadoJueces?.juez3_valido !== null && estadoJueces?.juez3_valido !== undefined

  // Elementos de control reutilizados en layout mobile (filas apiladas) y desktop (una fila).
  const cronometroEl = (
    <Cronometro
      corriendo={estadoJueces?.corriendo}
      tiempoInicial={estadoJueces?.tiempo_restante ?? 60}
      onExpire={handleCronoExpire}
    />
  )
  const playPauseEl = (
    <Stack direction="row" spacing={1.5}>
      <Tooltip title="Iniciar cronómetro" placement="top" arrow>
        <span>
          <Button variant="contained" onClick={iniciarCronometro} disabled={estadoJueces?.corriendo}
            aria-label="Iniciar cronómetro"
            sx={{ width: { xs: 56, md: 68 }, height: { xs: 56, md: 68 }, bgcolor: '#ff6b35', '&:hover': { bgcolor: '#e55a27' }, borderRadius: 2 }}>
            <PlayArrowIcon sx={{ fontSize: { xs: 30, md: 40 } }} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Pausar cronómetro" placement="top" arrow>
        <span>
          <Button variant="contained" color="error" onClick={detenerCronometro} disabled={!estadoJueces?.corriendo}
            aria-label="Pausar cronómetro"
            sx={{ width: { xs: 56, md: 68 }, height: { xs: 56, md: 68 }, borderRadius: 2 }}>
            <PauseIcon sx={{ fontSize: { xs: 30, md: 40 } }} />
          </Button>
        </span>
      </Tooltip>
    </Stack>
  )
  const juecesEl = (
    <Stack direction="row" spacing={1.5}>
      {[estadoJueces?.juez1_valido, estadoJueces?.juez2_valido, estadoJueces?.juez3_valido].map((valido, i) => {
        const color = !todosVotaron ? (isDark ? '#2e2e2e' : '#e0e0e0')
          : valido === true ? '#00e676' : '#ff1744'
        return (
          <Box key={i} sx={{
            width: { xs: 56, md: 68 }, height: { xs: 56, md: 68 }, borderRadius: 2,
            backgroundColor: color,
            boxShadow: !todosVotaron ? 'none'
              : valido === true ? '0 0 20px 4px rgba(0,230,118,0.5)' : '0 0 20px 4px rgba(255,23,68,0.5)',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
          }} />
        )
      })}
    </Stack>
  )
  const accionesEl = (
    <Stack direction="row" spacing={1.5}>
      <Tooltip title="Marcar intento válido" placement="top" arrow>
        <span>
          <Button variant="contained" onClick={() => marcarIntento(true)}
            disabled={!atletaSeleccionado || !pesoActual}
            aria-label="Marcar intento válido"
            sx={{ width: { xs: 56, md: 68 }, height: { xs: 56, md: 68 }, bgcolor: '#00e676', '&:hover': { bgcolor: '#00c853' }, borderRadius: 2 }}>
            <CheckIcon sx={{ fontSize: { xs: 30, md: 40 } }} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Marcar intento nulo" placement="top" arrow>
        <span>
          <Button variant="contained" onClick={() => marcarIntento(false)}
            disabled={!atletaSeleccionado || !pesoActual}
            aria-label="Marcar intento nulo"
            sx={{ width: { xs: 56, md: 68 }, height: { xs: 56, md: 68 }, bgcolor: '#ff1744', '&:hover': { bgcolor: '#d50000' }, borderRadius: 2 }}>
            <CloseIcon sx={{ fontSize: { xs: 34, md: 46 }, strokeWidth: 1.5 }} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Restablecer intento" placement="top" arrow>
        <span>
          <Button variant="contained" onClick={restablecerIntento}
            disabled={!atletaSeleccionado}
            aria-label="Restablecer intento"
            sx={{ width: { xs: 56, md: 68 }, height: { xs: 56, md: 68 }, bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, borderRadius: 2 }}>
            <RestartAltIcon sx={{ fontSize: { xs: 30, md: 40 } }} />
          </Button>
        </span>
      </Tooltip>
    </Stack>
  )

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>

      <DeleteGenericModal
        open={modalRestablecerAbierto}
        title="Restablecer competencia"
        subtitle="El progreso actual se eliminará."
        nombre="Todos los intentos registrados"
        descripcion="Se conservarán los pesos establecidos para los primeros tiros. Los intentos volverán a quedar pendientes, como si la competencia todavía no hubiera comenzado."
        confirmLabel="Restablecer"
        plainContent
        onClose={() => setModalRestablecerAbierto(false)}
        onConfirm={restablecerCompetencia}
        loading={restableciendoCompetencia}
      />

      {/* Header + cola no bloqueante de próximos pesos */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}>
        <Box sx={{ flex: '0 0 auto', minWidth: { md: 158 } }}>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>Cargadores</Typography>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
            <Chip label={ejercicioLabel} size="small" sx={{ bgcolor: ejercicioColor, color: '#fff', fontWeight: 700, fontSize: '0.75rem' }} />
            <Chip label={`Tanda ${letraTanda(tandaFiltro)}`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
            {pesoFiltro !== 'todos' && (
              <Chip label={pesoFiltro} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
            )}
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setModalRestablecerAbierto(true)}
              disabled={restableciendoCompetencia}
              sx={{ ml: 0.5, textTransform: 'none', fontWeight: 700 }}
            >
              {restableciendoCompetencia ? 'Restableciendo...' : 'Restablecer competencia'}
            </Button>
          </Stack>
        </Box>

        <Box
          aria-label="Próximos pesos pendientes"
          sx={{
            flex: 1, minWidth: 0, minHeight: 68, display: 'flex', alignItems: 'center',
            gap: 1, overflowX: 'auto', overflowY: 'hidden',
            pb: solicitudesPeso.length > 0 ? 0.5 : 0,
            scrollbarWidth: 'thin',
            scrollbarColor: `${isDark ? 'rgba(255,255,255,.12)' : 'rgba(20,30,45,.10)'} transparent`,
            '&::-webkit-scrollbar': {
              height: 3,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
              marginInline: 18,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? 'rgba(255,255,255,.12)' : 'rgba(20,30,45,.10)',
              borderRadius: 999,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,.24)' : 'rgba(20,30,45,.20)',
            },
          }}
        >
          {solicitudesPeso.length === 0 ? (
            <Box
              sx={{
                width: '100%', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px dashed ${border}`, borderRadius: 2, color: 'text.disabled',
              }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Los próximos pesos aparecerán acá
              </Typography>
            </Box>
          ) : solicitudesPeso.map(solicitud => (
            <TarjetaProximoPeso
              key={solicitud.id}
              data={solicitud}
              onConfirm={confirmarSolicitudPeso}
              onDismiss={descartarSolicitudPeso}
              isDark={isDark}
            />
          ))}
        </Box>
      </Stack>

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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 0.8fr 1.4fr' },
              bgcolor: isDark ? '#111d18' : '#f5faf7',
              borderBottom: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
            }}
          >
            {[
              {
                label: 'Ejercicio',
                value: ejercicioFiltro,
                onChange: (e) => setEjercicioFiltro(e.target.value),
                options: [
                  ['sentadilla', 'Sentadilla'],
                  ['banco', 'Banco'],
                  ['peso_muerto', 'Peso Muerto'],
                ],
              },
              {
                label: 'Tanda',
                value: tandaFiltro,
                onChange: (e) => setTandaFiltro(e.target.value),
                options: TANDA_IDS.map((id) => [id, `Tanda ${letraTanda(id)}`]),
              },
              {
                label: 'Categoría',
                value: pesoFiltro,
                onChange: (e) => setPesoFiltro(e.target.value),
                options: [['todos', 'Todas las categorías'], ...todasLasCategorias.map(c => [c, c])],
              },
            ].map((filtro, index) => (
              <Box
                key={filtro.label}
                sx={{
                  minWidth: 0, px: 1.25, pt: 1, pb: 0.65, textAlign: 'center',
                  gridColumn: { xs: index === 2 ? '1 / -1' : 'auto', sm: 'auto' },
                  borderLeft: {
                    xs: index === 1 ? `1px solid ${isDark ? '#244238' : '#d6e7df'}` : 'none',
                    sm: index > 0 ? `1px solid ${isDark ? '#244238' : '#d6e7df'}` : 'none',
                  },
                  borderTop: {
                    xs: index === 2 ? `1px solid ${isDark ? '#244238' : '#d6e7df'}` : 'none',
                    sm: 'none',
                  },
                }}
              >
                <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, letterSpacing: 1.05, textTransform: 'uppercase', color: '#8aa9a0' }}>
                  {filtro.label}
                </Typography>
                <Select
                  size="small"
                  value={filtro.value}
                  onChange={filtro.onChange}
                  fullWidth
                  inputProps={{ 'aria-label': filtro.label }}
                  sx={{
                    mt: 0.25, height: 32, borderRadius: 0, fontSize: '0.9rem', fontWeight: 800,
                    '& .MuiOutlinedInput-notchedOutline': { border: 0 },
                    '&:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
                    '& .MuiSelect-select': { py: 0.5, pl: 3, pr: '28px !important', textAlign: 'center' },
                    '& .MuiSelect-icon': { right: 4, color: '#8aa9a0' },
                  }}
                >
                  {filtro.options.map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, ...tinteRowSx }}>
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
                getRowClassName={getRowClassNameCategoria}
                columnVisibilityModel={{ nombre: !isMobile, tanda_id: !isMobile, categoria: !isMobile && !isTableCramped }}
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
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 3 }, gap: 2, position: 'relative' }}>

              {/* Ficha compacta de competencia */}
              <Box
                sx={{
                  mx: { xs: -1.5, md: -3 },
                  mt: { xs: -1.5, md: -3 },
                  overflow: 'hidden',
                  borderBottom: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
                  borderRadius: 0,
                  bgcolor: isDark ? '#111d18' : '#f5faf7',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: '0.65fr 1.15fr 1.55fr 0.8fr' },
                  }}
                >
                  {[
                    {
                      label: 'Rack',
                      value: ejercicioFiltro === 'sentadilla'
                        ? (formatearAlturaRack(atletaSeleccionado.altura_rack_sentadilla) || '—')
                        : ejercicioFiltro === 'banco'
                          ? (formatearAlturaRack(atletaSeleccionado.altura_rack_banco) || '—')
                          : '—',
                      editable: ejercicioFiltro === 'sentadilla' || ejercicioFiltro === 'banco',
                    },
                    {
                      label: 'Peso en barra',
                      value: pesoActual > 0 ? `${pesoActual} kg` : '—',
                      detail: pesoActual > 0 ? 'Barra 20 kg + Topes 5 kg' : null,
                    },
                    {
                      label: 'Atleta',
                      value: `${capitalizeWords(atletaSeleccionado.nombre)} ${capitalizeWords(atletaSeleccionado.apellido)}`,
                      detail: claveCategoriaPlataforma(atletaSeleccionado),
                    },
                    {
                      label: 'Intento',
                      value: `${intentoSeleccionado}°`,
                      detail: ejercicioLabel,
                    },
                  ].map((dato, index) => (
                    <Box
                      key={dato.label}
                      sx={{
                        minWidth: 0, minHeight: { xs: 72, md: 82 }, px: { xs: 1.25, md: 2 }, py: 1.25,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center',
                        borderLeft: {
                          xs: index % 2 === 1 ? `1px solid ${isDark ? '#244238' : '#d6e7df'}` : 'none',
                          md: index > 0 ? `1px solid ${isDark ? '#244238' : '#d6e7df'}` : 'none',
                        },
                        borderTop: {
                          xs: index > 1 ? `1px solid ${isDark ? '#244238' : '#d6e7df'}` : 'none',
                          md: 'none',
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.68rem', lineHeight: 1, letterSpacing: 1.1, textTransform: 'uppercase', color: '#8aa9a0' }}>
                        {dato.label}
                      </Typography>
                      {dato.editable ? (
                        <Select
                          value={
                            (ejercicioFiltro === 'sentadilla'
                              ? atletaSeleccionado.altura_rack_sentadilla
                              : atletaSeleccionado.altura_rack_banco) || ''
                          }
                          onChange={(e) => actualizarAlturaRack(Number(e.target.value))}
                          displayEmpty
                          variant="standard"
                          disableUnderline
                          MenuProps={{
                            PaperProps: { style: { maxHeight: 48 * 10.5 } },
                          }}
                          sx={{
                            width: '100%', mt: 0.65,
                            fontSize: { xs: '0.95rem', md: '1.05rem' },
                            fontWeight: 900, lineHeight: 1.1, color: 'text.primary',
                            '& .MuiSelect-select': { py: 0, textAlign: 'center' },
                          }}
                        >
                          <MenuItem value=""><em>—</em></MenuItem>
                          {ALTURAS_RACK.map((altura) => (
                            <MenuItem key={altura} value={altura}>{formatearAlturaRack(altura)}</MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <Typography
                          noWrap
                          sx={{
                            width: '100%', mt: 0.65, color: dato.label === 'Peso en barra' ? ejercicioColor : 'text.primary',
                            fontSize: dato.label === 'Peso en barra' ? { xs: '1.35rem', md: '1.7rem' } : { xs: '0.95rem', md: '1.05rem' },
                            fontWeight: 900, lineHeight: 1.1,
                          }}
                        >
                          {dato.value}
                        </Typography>
                      )}
                      {dato.detail && (
                        <Typography noWrap sx={{ width: '100%', mt: 0.45, fontSize: '0.67rem', color: 'text.secondary', fontWeight: 600 }}>
                          {dato.detail}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

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
                            if (p >= 25) return 'clamp(36px, 9vh, 130px)'
                            if (p >= 20) return 'clamp(33px, 8.2vh, 120px)'
                            if (p >= 15) return 'clamp(30px, 7.6vh, 110px)'
                            if (p >= 10) return 'clamp(28px, 7.2vh, 105px)'
                            if (p >= 5)  return 'clamp(25px, 6.5vh, 95px)'
                            if (p >= 2.5) return 'clamp(22px, 5.8vh, 85px)'
                            if (p >= 1.25) return 'clamp(20px, 5.3vh, 78px)'
                            return 'clamp(18px, 4.8vh, 70px)'
                          }
                          const tiposDeDiscos = Object.keys(discos.reduce((acc, d) => { acc[d] = true; return acc }, {})).length
                          const ancho = tiposDeDiscos > 3 ? 'clamp(46px, 10vw, 150px)' : 'clamp(58px, 13vw, 190px)'

                          const textColor = p == 15 || p == 5 || p == 1.25 || p == 0.5 || p == 0.25 ? '#000' : '#fff'
                          const bgColor = p == 25 ? '#f44336' : p == 20 ? '#2196f3' : p == 15 ? '#ffeb3b' : p == 10 ? '#4caf50' : p == 5 ? '#fff' : p == 2.5 ? '#000' : p == 1.25 ? '#C0C0C0' : '#9e9e9e'

                          return (
                            <Box key={peso} sx={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 2, px: 'clamp(6px, 1.2vw, 18px)', py: getAltura(p),
                              width: ancho, fontWeight: 'bold', color: textColor,
                              backgroundColor: bgColor,
                              border: p == 5 ? '2px solid #d0d0d0' : 'none',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1, fontSize: 'clamp(1.3rem, 4.5vh, 4.5rem)', fontWeight: 900 }}>
                                <div>{peso}</div>
                                <Box component="div" sx={{ fontSize: 'clamp(0.85rem, 2.6vh, 2.8rem)', opacity: 0.8 }}>×</Box>
                                <div>{cantidad}</div>
                              </Box>
                            </Box>
                          )
                        })}

                      {/* Tope */}
                      <Box sx={{ borderRadius: 1, width: 'clamp(14px, 1.6vw, 32px)', height: 'clamp(90px, 24vh, 200px)', backgroundColor: '#9e9e9e', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <FitnessCenterIcon sx={{ fontSize: 64 }} style={{ marginBottom: 8, opacity: 0.38 }} />
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

              {/* Controles — mobile: filas apiladas; desktop: una fila */}
              {isMobile ? (
                <Stack spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                    {cronometroEl}
                    {playPauseEl}
                  </Stack>
                  {juecesEl}
                  {accionesEl}
                </Stack>
              ) : (
                <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" flexWrap="wrap">
                  {cronometroEl}
                  {playPauseEl}
                  {juecesEl}
                  {accionesEl}
                </Stack>
              )}

              {(!atletaSeleccionado || !pesoActual) && (
                <Typography variant="caption" color="error" textAlign="center">
                  Selecciona un atleta e intento para marcar el resultado
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}>
              <FitnessCenterIcon sx={{ fontSize: 72 }} style={{ opacity: 0.38 }} />
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
