'use client'

import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import {
  Box, Typography, Paper, FormControl, InputLabel,
  Select, MenuItem, useMediaQuery, useTheme,
  Button, Stack, CircularProgress, Divider, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material'
import { Groups as GroupsIcon, Person as PersonIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon, Check as CheckIcon, Block as BlockIcon, RestartAlt as RestartAltIcon, FitnessCenter as FitnessCenterIcon } from '@mui/icons-material'
import { toast } from 'react-toastify'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { supabase, fetchAtletasConIntentos } from '../../../lib/supabaseClient'
import { joinCompetenciaLive } from '../../../lib/competenciaLive'
import { capitalizeWords } from '../../../utils/textUtils'
import { colorCategoria } from '../../../utils/colorCategoria'
import { useDarkMode } from '../../../context/ThemeContext'
import categorias from '../../../const/categorias/categorias'

// ── Helpers puros a nivel módulo (refs estables -> columns memoizable) ──
const MOVIMIENTO_MAP = { sentadilla: 1, banco: 2, peso_muerto: 3 }
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

// Modal "próximo peso": se abre al marcar el intento. Timer de 60s AISLADO (su tick no
// re-renderiza el page). Muestra el peso sugerido (válido: +2.5 / nulo: mismo), editable,
// con botón rápido +2.5. Si el timer llega a 0 sin confirmar, aplica el sugerido (auto).
const ModalProximoPeso = memo(function ModalProximoPeso({ data, onConfirm, onClose }) {
  const open = !!data
  const [valor, setValor] = useState('')
  const [segundos, setSegundos] = useState(60)
  const intervalRef = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  // `marca` (timestamp del parent) cambia en cada apertura -> reinicia el timer aunque
  // sea el mismo atleta/intento.
  const claveApertura = data ? `${data.atletaId}-${data.proximoIntento}-${data.marca}` : null
  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (!claveApertura) return

    setValor(String(dataRef.current.pesoSugerido ?? ''))
    setSegundos(60)
    let s = 60
    intervalRef.current = setInterval(() => {
      s -= 1
      setSegundos(Math.max(0, s))
      if (s <= 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        const d = dataRef.current
        if (d) onConfirmRef.current?.(d.atletaId, d.ejercicio, d.proximoIntento, d.pesoSugerido) // auto
      }
    }, 1000)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [claveApertura])

  if (!open) return null

  const color = data.ejercicioColor || '#ff6b35'
  const urgente = segundos <= 10
  const masDosCinco = () => setValor(String((parseFloat(dataRef.current.pesoActual) || 0) + 2.5))
  const confirmar = () => {
    const n = parseFloat(valor)
    const d = dataRef.current
    if (d && !isNaN(n) && n > 0) onConfirm(d.atletaId, d.ejercicio, d.proximoIntento, n)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography component="div" sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2 }}>
          Próximo peso — {data.proximoIntento}° intento
        </Typography>
        <Typography component="div" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {data.atletaNombre} · {data.valido ? 'Intento VÁLIDO' : 'Intento NULO'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: urgente ? '#ff1744' : color }}>
              0:{String(segundos).padStart(2, '0')}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              Si no confirmás, se aplica <b>{data.pesoSugerido} kg</b>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="number" label="Peso (kg)" value={valor} autoFocus size="small" fullWidth
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmar() }}
            />
            <Button variant="outlined" onClick={masDosCinco} sx={{ whiteSpace: 'nowrap', borderColor: color, color }}>
              +2.5 kg
            </Button>
          </Stack>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            Intento actual: {data.pesoActual} kg
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cerrar</Button>
        <Button variant="contained" onClick={confirmar} sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default function CargadoresPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
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
  const [estadoJueces, setEstadoJueces] = useState(null)
  const [sortModel, setSortModel] = useState([])
  const [modalPeso, setModalPeso] = useState(null) // próximo peso: null = cerrado
  const autoMarcadoRef = useRef(false)
  const prevAtletaIdRef = useRef(null)
  const liveRef = useRef(null)

  const fetchAtletas = useCallback(async () => {
    setIsLoading(true)
    try {
      // Lectura directa desde la view (sin hop por Express).
      const data = await fetchAtletasConIntentos({ tandaId: tandaFiltro })
      setAtletas(data)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tandaFiltro])

  useEffect(() => { fetchAtletas() }, [fetchAtletas])

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

  useEffect(() => {
    const fetchEstadoInicial = async () => {
      // Lectura directa (sin hop Express)
      const { data } = await supabase.from('estado_competencia').select('*').eq('id', 1).maybeSingle()
      if (data) setEstadoJueces(data)
    }
    fetchEstadoInicial()

    // Autoritativo: reconcilia el estado real
    const channel = supabase
      .channel('public:estado_competencia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        (payload) => { setEstadoJueces(payload.new) }
      )
      .subscribe()

    // Fast-path: votos de jueces al instante -> luces + auto-marcado más rápidos.
    // El merge parcial se reconcilia luego con postgres_changes (idempotente).
    liveRef.current = joinCompetenciaLive((parcial) =>
      setEstadoJueces(prev => prev ? { ...prev, ...parcial } : prev)
    )

    return () => { supabase.removeChannel(channel); liveRef.current?.leave() }
  }, [])

  // Al llegar a 0 el cronómetro (child), apagar el estado en DB. Una sola escritura,
  // no una por segundo. El page ya no re-renderiza con el tick.
  const handleCronoExpire = useCallback(async () => {
    await supabase.from('estado_competencia')
      .update({ corriendo: false, tiempo_restante: 0, updated_at: new Date() })
      .eq('id', 1)
  }, [])

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

  const iniciarCronometro = useCallback(async () => {
    try {
      // Fast-path: la vista arranca el cronómetro al instante.
      liveRef.current?.send({
        corriendo: true, tiempo_restante: 60,
        juez1_valido: null, juez2_valido: null, juez3_valido: null,
        juez1_tipo: null, juez2_tipo: null, juez3_tipo: null, intento_valido: null,
      })
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jueces/start`, { method: 'POST' })
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
      if (valido) {
        // Válido: abrir modal con timer 60s para confirmar/modificar (default +2.5).
        setModalPeso({
          atletaId,
          atletaNombre: `${atletaSeleccionado.nombre ?? ''} ${atletaSeleccionado.apellido ?? ''}`.trim(),
          ejercicio: ejercicioFiltro,
          ejercicioColor: { sentadilla: '#1976d2', banco: '#d32f2f', peso_muerto: '#388e3c' }[ejercicioFiltro],
          proximoIntento,
          pesoActual: pesoNum,
          pesoSugerido: pesoNum + 2.5,
          valido,
          marca: Date.now(),
        })
      } else {
        // Nulo: mismo peso, automático, sin modal ni espera.
        asignarProximoPeso(atletaId, ejercicioFiltro, proximoIntento, pesoNum)
      }
    }

    // 3) Persistir en background (no bloquea la UI)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
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
    // Optimista: limpiar el intento. (Para intento 1 el backend puede caer al valor de apertura,
    // por eso reconciliamos con fetchAtletas después.)
    setAtletas(prev => prev.map(a => a.id === atletaId
      ? aplicarIntentoLocal(a, ejercicioFiltro, intentoSeleccionado, null, null) : a))
    toast.info('Intento restablecido')
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
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
      await fetchAtletas()
    } catch (err) { console.error('Error al restablecer intento:', err); toast.error('Error al restablecer el intento') }
  }, [atletaSeleccionado, ejercicioFiltro, intentoSeleccionado, fetchAtletas])

  const cerrarModalPeso = useCallback(() => setModalPeso(null), [])

  // Asigna el peso del intento siguiente (confirmado o automático por timeout).
  const asignarProximoPeso = useCallback(async (atletaId, ejercicio, proximoIntento, nuevoPeso) => {
    setModalPeso(null)
    const n = parseFloat(nuevoPeso)
    if (isNaN(n) || n <= 0) return
    // Optimista: cargar el peso del próximo intento (sin validar todavía).
    setAtletas(prev => prev.map(a => a.id === atletaId
      ? aplicarIntentoLocal(a, ejercicio, proximoIntento, n, null) : a))
    toast.info(`${proximoIntento}° intento: ${n} kg`)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
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
    } catch (err) { console.error('Error al asignar próximo peso:', err); fetchAtletas() }
  }, [fetchAtletas])

  const handleCellClick = useCallback(async (params) => {
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
    // Fast-path: la vista muestra el nuevo atleta/peso al instante.
    liveRef.current?.send(nuevoEstado)

    const { error } = await supabase.from('estado_competencia')
      .update({ ...nuevoEstado, updated_at: new Date() })
      .eq('id', 1)

    if (error) console.error('Error al actualizar atleta actual:', error)
  }, [pesoFiltro, atletasOrdenados, ejercicioFiltro])

  const processRowUpdate = useCallback(async (newRow, oldRow) => {
    try {
      const ek = ejercicioFiltro === 'banco' ? 'banco' : ejercicioFiltro === 'peso_muerto' ? 'peso_muerto' : 'sentadilla'
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
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentos: cambios })
      }).catch(err => { console.error('Error al actualizar peso:', err); fetchAtletas() })

      return newRow
    } catch (err) { console.error('Error al actualizar peso:', err); return oldRow }
  }, [ejercicioFiltro, fetchAtletas])

  const handleProcessRowUpdateError = useCallback((error) => { console.error('Error al procesar actualización:', error) }, [])

  // Memoizado: solo se reconstruye al cambiar de ejercicio, no en cada render/tick.
  const columns = useMemo(() => [
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
      field: 'equipo', headerName: 'Equipo', flex: 0.06, minWidth: 110,
      align: 'center', headerAlign: 'center', sortable: false,
      valueGetter: (value, row) => row.equipo_nombre ?? '',
      renderCell: (params) => {
        const nombre = params.row.equipo_nombre
        if (!nombre) return '-'
        return (
          <Chip
            avatar={
              <Avatar src={params.row.equipo_foto || undefined} sx={{ bgcolor: params.row.equipo_color || '#bdbdbd' }}>
                <GroupsIcon sx={{ fontSize: 14 }} />
              </Avatar>
            }
            label={nombre}
            size="small"
            sx={{
              fontWeight: 600, fontSize: '0.72rem',
              bgcolor: params.row.equipo_color || '#9e9e9e', color: '#fff', border: 'none',
              '& .MuiChip-avatar': { color: '#fff' },
            }}
          />
        )
      },
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
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18 }} htmlColor="#4caf50" />}
            {valido === false && <CancelIcon sx={{ fontSize: 18 }} htmlColor="#f44336" />}
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
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18 }} htmlColor="#4caf50" />}
            {valido === false && <CancelIcon sx={{ fontSize: 18 }} htmlColor="#f44336" />}
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
            {valido === true && <CheckCircleIcon sx={{ fontSize: 18 }} htmlColor="#4caf50" />}
            {valido === false && <CancelIcon sx={{ fontSize: 18 }} htmlColor="#f44336" />}
          </Box>
        )
      },
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
    () => [...new Set(atletasMostrados.map(a => a.categoria).filter(Boolean))],
    [atletasMostrados]
  )
  const tinteRowSx = useMemo(() => categoriasEnTanda.reduce((acc, cat, i) => {
    const color = `${colorCategoria(cat)}59` // mismo color de la categoria, ~35% alpha
    acc[`& .MuiDataGrid-row.catgrp-${i}`] = {
      backgroundColor: color,
      '&:hover': { backgroundColor: color },
    }
    return acc
  }, {}), [categoriasEnTanda])
  const getRowClassNameCategoria = useCallback((params) => {
    const i = categoriasEnTanda.indexOf(params.row.categoria)
    return i >= 0 ? `catgrp-${i}` : ''
  }, [categoriasEnTanda])

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
                columnVisibilityModel={{ nombre: !isMobile, tanda_id: !isMobile, categoria: !isMobile, equipo: !isMobile }}
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

              {/* Datos del atleta (compacto, arriba a la derecha) */}
              <Box sx={{ position: 'absolute', top: 16, right: 16, textAlign: 'right', maxWidth: '60%' }}>
                <Typography fontWeight={800} sx={{ fontSize: '1.25rem', lineHeight: 1.1, color: ejercicioColor }}>
                  {capitalizeWords(atletaSeleccionado.nombre)} {capitalizeWords(atletaSeleccionado.apellido)}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                  <Chip label={atletaSeleccionado.categoria} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    Intento {intentoSeleccionado}°
                  </Typography>
                </Stack>
              </Box>

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

              {/* Presentación equipo + coach */}
              {atletaSeleccionado.equipo_nombre && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    divider={<Divider orientation="vertical" flexItem sx={{ borderColor: border }} />}
                    sx={{
                      px: 2.5, py: 1, borderRadius: 3,
                      border: `1px solid ${border}`,
                      backgroundColor: isDark ? '#242424' : '#fafafa',
                    }}
                  >
                    {/* Equipo */}
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar
                        src={atletaSeleccionado.equipo_foto || undefined}
                        sx={{ width: 44, height: 44, bgcolor: atletaSeleccionado.equipo_color || '#9e9e9e' }}
                      >
                        <GroupsIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1 }}>
                          Equipo
                        </Typography>
                        <Typography fontWeight={800} sx={{ lineHeight: 1.1 }}>
                          {capitalizeWords(atletaSeleccionado.equipo_nombre)}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Coach */}
                    {atletaSeleccionado.equipo_coach_nombre && (
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar src={atletaSeleccionado.equipo_coach_foto || undefined} sx={{ width: 44, height: 44, bgcolor: '#bdbdbd' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1 }}>
                            Coach
                          </Typography>
                          <Typography fontWeight={800} sx={{ lineHeight: 1.1 }}>
                            {capitalizeWords(atletaSeleccionado.equipo_coach_nombre)}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                  </Stack>
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

              {/* Controles */}
              <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" flexWrap="wrap">
                {/* Cronometro corriendo (chico, a la izquierda del play) — aislado: su tick no re-renderiza el page */}
                <Cronometro
                  corriendo={estadoJueces?.corriendo}
                  tiempoInicial={estadoJueces?.tiempo_restante ?? 60}
                  onExpire={handleCronoExpire}
                />
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
              <FitnessCenterIcon sx={{ fontSize: 72 }} style={{ opacity: 0.38 }} />
              <Typography variant="h6" color="text.secondary" textAlign="center">
                Selecciona un atleta de la tabla para ver los discos
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Modal "próximo peso" (timer 60s) — solo en Cargadores */}
      <ModalProximoPeso data={modalPeso} onConfirm={asignarProximoPeso} onClose={cerrarModalPeso} />
    </Box>
  )
}
