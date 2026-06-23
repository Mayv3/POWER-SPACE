'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, Paper, Divider, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Checkbox, Alert, Snackbar, IconButton, Tooltip,
  Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material'
import { Save as SaveIcon, CleaningServices as CleaningServicesIcon, Visibility as VisibilityIcon, Delete as DeleteIcon, Inventory2 as InventoryIcon } from '@mui/icons-material'
import { useDarkMode } from '../../../context/ThemeContext'
import { apiFetch } from '../../../lib/api'

export default function HistoricoPage() {
  const [snapshots, setSnapshots] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' })

  // dialogos
  const [openArchivar, setOpenArchivar] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [openLimpiar, setOpenLimpiar] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)

  const [eliminarTarget, setEliminarTarget] = useState(null)

  // visor (solo lectura)
  const [verSnap, setVerSnap] = useState(null)
  const [verData, setVerData] = useState(null)
  const [verLoading, setVerLoading] = useState(false)
  const [verTab, setVerTab] = useState(0)

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const showToast = (msg, severity = 'success') => setToast({ open: true, msg, severity })

  const fetchSnapshots = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/historico`)
      const data = await res.json()
      setSnapshots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar historial:', err)
      showToast('No se pudo cargar el historial', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchSnapshots() }, [])

  const handleArchivar = async () => {
    setBusy(true)
    try {
      const res = await apiFetch(`/api/historico/archivar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() || null, descripcion: descripcion.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setOpenArchivar(false)
      setNombre(''); setDescripcion('')
      await fetchSnapshots()
      showToast('Datos archivados correctamente')
    } catch {
      showToast('Error al archivar', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleLimpiar = async () => {
    setBusy(true)
    try {
      const res = await apiFetch(`/api/historico/limpiar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivar: autoBackup }),
      })
      if (!res.ok) throw new Error()
      setOpenLimpiar(false)
      await fetchSnapshots()
      showToast('Tablas limpiadas. Listo para testear.')
    } catch {
      showToast('Error al limpiar', 'error')
    } finally {
      setBusy(false)
    }
  }

  const abrirVer = async (snap) => {
    setVerSnap(snap)
    setVerData(null)
    setVerTab(0)
    setVerLoading(true)
    try {
      const res = await apiFetch(`/api/historico/${snap.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVerData(data)
    } catch {
      showToast('No se pudo cargar el respaldo', 'error')
      setVerSnap(null)
    } finally {
      setVerLoading(false)
    }
  }

  const cerrarVer = () => { setVerSnap(null); setVerData(null) }

  const handleEliminar = async () => {
    if (!eliminarTarget) return
    setBusy(true)
    try {
      const res = await apiFetch(`/api/historico/${eliminarTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setEliminarTarget(null)
      await fetchSnapshots()
      showToast('Snapshot eliminado')
    } catch {
      showToast('Error al eliminar', 'error')
    } finally {
      setBusy(false)
    }
  }

  const fmtFecha = (s) => {
    try { return new Date(s).toLocaleString('es-AR') } catch { return s }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Datos / Historial
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Respaldá la competencia actual y limpiá las tablas para testear.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => setOpenArchivar(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#F57C00', '&:hover': { backgroundColor: '#E65100' }, flex: { xs: 1, sm: 'none' } }}
          >
            Archivar ahora
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CleaningServicesIcon />}
            onClick={() => setOpenLimpiar(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flex: { xs: 1, sm: 'none' } }}
          >
            Limpiar para testear
          </Button>
        </Stack>
      </Stack>

      {/* Lista de snapshots */}
      <Paper
        elevation={0}
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: `1px solid ${border}`, borderRadius: 3, overflow: 'hidden', backgroundColor: surface }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon sx={{ fontSize: 18 }} style={{ opacity: 0.6 }} />
          <Typography variant="body2" color="text.secondary">
            {snapshots.length} {snapshots.length === 1 ? 'respaldo' : 'respaldos'}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: border }} />

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={36} sx={{ color: '#FF9800' }} />
            </Box>
          ) : snapshots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              No hay respaldos todavía. Tocá "Archivar ahora" para crear el primero.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {snapshots.map((snap) => (
                <Paper
                  key={snap.id}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, borderColor: border, backgroundColor: isDark ? '#2f2f2f' : '#fafafa' }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        #{snap.id} — {snap.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fmtFecha(snap.creado_at)}
                      </Typography>
                      {snap.descripcion && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {snap.descripcion}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1, gap: 0.75 }}>
                        {snap.conteo && Object.entries(snap.conteo).map(([tabla, n]) => (
                          <Chip key={tabla} size="small" label={`${tabla}: ${n}`} sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
                        ))}
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Ver datos del respaldo">
                        <IconButton color="primary" onClick={() => abrirVer(snap)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar respaldo">
                        <IconButton color="error" onClick={() => setEliminarTarget(snap)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Dialog Archivar */}
      <Dialog open={openArchivar} onClose={() => !busy && setOpenArchivar(false)} fullWidth maxWidth="sm">
        <DialogTitle fontWeight={700}>Archivar datos actuales</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Guarda una copia completa (atletas, intentos, estado, tandas y movimientos) sin borrar nada.
          </Typography>
          <Stack spacing={2}>
            <TextField label="Nombre del respaldo" placeholder="Ej: Torneo Provincial 2026" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth size="small" />
            <TextField label="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} fullWidth size="small" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenArchivar(false)} disabled={busy} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleArchivar} disabled={busy} variant="contained" sx={{ textTransform: 'none', backgroundColor: '#F57C00', '&:hover': { backgroundColor: '#E65100' } }}>
            {busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Archivar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Limpiar */}
      <Dialog open={openLimpiar} onClose={() => !busy && setOpenLimpiar(false)} fullWidth maxWidth="sm">
        <DialogTitle fontWeight={700}>Limpiar tablas para testear</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Borra <b>atletas</b> e <b>intentos</b> y resetea el estado en vivo. Conserva tandas y movimientos. Esta acción no se puede deshacer (salvo restaurando un respaldo).
          </Alert>
          <FormControlLabel
            control={<Checkbox checked={autoBackup} onChange={(e) => setAutoBackup(e.target.checked)} />}
            label="Crear un respaldo automático antes de limpiar (recomendado)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenLimpiar(false)} disabled={busy} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleLimpiar} disabled={busy} variant="contained" color="error" sx={{ textTransform: 'none' }}>
            {busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Limpiar ahora'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Ver (solo lectura) */}
      <Dialog open={Boolean(verSnap)} onClose={cerrarVer} fullWidth maxWidth="lg">
        <DialogTitle fontWeight={700}>
          {verSnap && <>#{verSnap.id} — {verSnap.nombre}</>}
          {verSnap && (
            <Typography variant="caption" color="text.secondary" display="block">
              {fmtFecha(verSnap.creado_at)} · solo lectura
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {verLoading || !verData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={36} sx={{ color: '#FF9800' }} />
            </Box>
          ) : (() => {
            const tablas = Object.keys(verData.registros || {})
            if (tablas.length === 0) {
              return <Typography variant="body2" color="text.secondary">Sin datos en este respaldo.</Typography>
            }
            const tablaActual = tablas[verTab] || tablas[0]
            const filas = verData.registros[tablaActual] || []
            const columnas = filas.length ? Object.keys(filas[0]) : []
            return (
              <>
                <Tabs
                  value={verTab}
                  onChange={(e, v) => setVerTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 1 }}
                >
                  {tablas.map((t) => (
                    <Tab key={t} label={`${t} (${verData.registros[t].length})`} sx={{ textTransform: 'none' }} />
                  ))}
                </Tabs>
                <Box sx={{ overflow: 'auto', maxHeight: '60vh', border: `1px solid ${border}`, borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {columnas.map((c) => (
                          <TableCell key={c} sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: surface }}>{c}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filas.map((fila, i) => (
                        <TableRow key={i} hover>
                          {columnas.map((c) => (
                            <TableCell key={c} sx={{ whiteSpace: 'nowrap' }}>
                              {fila[c] === null || fila[c] === undefined
                                ? '—'
                                : typeof fila[c] === 'object'
                                  ? JSON.stringify(fila[c])
                                  : String(fila[c])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrarVer} sx={{ textTransform: 'none' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog open={Boolean(eliminarTarget)} onClose={() => !busy && setEliminarTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={700}>Eliminar respaldo</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar el respaldo {eliminarTarget && <b>#{eliminarTarget.id} — {eliminarTarget.nombre}</b>}? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEliminarTarget(null)} disabled={busy} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleEliminar} disabled={busy} variant="contained" color="error" sx={{ textTransform: 'none' }}>
            {busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
