'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, InputAdornment,
  CircularProgress, Card, CardContent, Avatar, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Chip,
  Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import { Search as SearchIcon, GroupAdd as GroupAddIcon, Groups as GroupsIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon, SupervisorAccount as SupervisorAccountIcon, ExpandMore as ExpandIcon, EmojiEvents as TrophyIcon, Info as InfoIcon } from '@mui/icons-material'
import { GenericModal } from '../../../components/modales/GenericModal'
import { EquipoForm } from '../../../components/modales/EquipoForm'
import { DeleteGenericModal } from '../../../components/modales/DeleteGenericModal'
import { useDarkMode } from '../../../context/ThemeContext'
import { capitalizeWords } from '../../../utils/textUtils'
import { apiFetch } from '../../../lib/api'

const EMPTY_EQUIPO = { nombre: '', foto: null, color: '#F57C00', coach_id: '' }

function CardMenu({ onEdit, onDelete }) {
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.25)', '&:hover': { bgcolor: 'rgba(0,0,0,0.4)' } }}
      >
        <MoreVertIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { elevation: 3, sx: { borderRadius: 2, minWidth: 140 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { onEdit(); setAnchor(null) }}>
          <ListItemIcon><EditIcon sx={{ fontSize: 20 }} htmlColor="#FF9800" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { onDelete(); setAnchor(null) }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 20 }} htmlColor="#d32f2f" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', color: 'error.main' }}>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

const MEDAL = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
const fmtNum = (n) => (n || n === 0 ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')

function PremiacionView({ premiacion, isLoading, surface, border, isDark }) {
  const muted = isDark ? '#9aa0ab' : '#6b7280'

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress size={40} sx={{ color: '#FF9800' }} />
      </Box>
    )
  }
  if (!premiacion || premiacion.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1, color: 'text.secondary' }}>
        <TrophyIcon sx={{ fontSize: 56 }} style={{ opacity: 0.4 }} />
        <Typography>No hay datos de premiación.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, color: muted }}>
        <InfoIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption">
          Puesto por ranking absoluto de IPF GL. Puntos por puesto: 1°=12, 2°=9, 3°=8, 4°=7 … 10°+=1. Suma de todos los atletas del equipo.
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        {premiacion.map((eq) => {
          const color = eq.color || '#9e9e9e'
          const medal = MEDAL[eq.posicion]
          // Solo los top 5 que aportan puntos al equipo.
          const filas = (eq.detalle || []).filter((a) => a.cuenta_para_equipo)
          return (
            <Accordion
              key={eq.id}
              disableGutters
              elevation={0}
              sx={{
                borderRadius: 3, border: `1px solid ${medal || border}`, backgroundColor: surface,
                overflow: 'hidden', '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandIcon sx={{ fontSize: 20 }} />} sx={{ px: 2, py: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                  {/* Posición */}
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16,
                    bgcolor: medal || (isDark ? '#3a3a3a' : '#eceff1'),
                    color: medal ? '#000' : 'text.secondary',
                  }}>
                    {eq.posicion}
                  </Box>
                  <Avatar src={eq.foto || undefined} sx={{ width: 40, height: 40, bgcolor: color, flexShrink: 0 }}>
                    <GroupsIcon sx={{ fontSize: 22 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={800} noWrap sx={{ lineHeight: 1.2 }}>
                      {capitalizeWords(eq.nombre)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: muted }} noWrap>
                      {eq.coach?.nombre ? capitalizeWords(eq.coach.nombre) : 'Sin coach'} · {eq.num_totalizaron}/{eq.num_atletas} totalizaron
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0, pr: 1 }}>
                    <Typography fontWeight={800} sx={{ fontSize: 22, lineHeight: 1, color: '#F57C00' }}>
                      {eq.puntaje}
                    </Typography>
                    <Typography variant="caption" sx={{ color: muted }}>pts</Typography>
                  </Box>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 0, pt: 0 }}>
                {filas.length === 0 ? (
                  <Typography variant="body2" sx={{ px: 2, py: 1.5, color: muted }}>
                    Sin atletas que puntúen en este equipo.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: muted }}>Pto.</TableCell>
                          <TableCell sx={{ color: muted }}>Atleta</TableCell>
                          <TableCell sx={{ color: muted }}>Categoría</TableCell>
                          <TableCell align="right" sx={{ color: muted }}>Peso</TableCell>
                          <TableCell align="right" sx={{ color: muted }}>Total</TableCell>
                          <Tooltip title="IPF GoodLift (fórmula oficial actual)"><TableCell align="right" sx={{ color: muted }}>IPF GL</TableCell></Tooltip>
                          <Tooltip title="IPF Points (fórmula anterior)"><TableCell align="right" sx={{ color: muted }}>IPF Pts</TableCell></Tooltip>
                          <TableCell align="right" sx={{ color: muted, fontWeight: 700 }}>Aporta</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filas.map((a) => (
                          <TableRow key={a.atleta_id} sx={{ opacity: a.totalizo ? 1 : 0.5 }}>
                            <TableCell>{a.totalizo ? a.puesto : '—'}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {capitalizeWords(`${a.nombre} ${a.apellido || ''}`)}
                              {!a.totalizo && (
                                <Chip label="No totalizó" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.categoria || '—'} · {a.modalidad || '—'}</TableCell>
                            <TableCell align="right">{a.peso_corporal ?? '—'} kg</TableCell>
                            <TableCell align="right">{a.total > 0 ? `${a.total} kg` : '—'}</TableCell>
                            <TableCell align="right">{a.totalizo ? fmtNum(a.ipf_gl) : '—'}</TableCell>
                            <TableCell align="right">{a.totalizo ? fmtNum(a.ipf_points) : '—'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: a.puntos ? '#F57C00' : muted }}>{a.puntos}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Stack>
    </Box>
  )
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState([])
  const [equiposFiltrados, setEquiposFiltrados] = useState([])
  const [coaches, setCoaches] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [vista, setVista] = useState('equipos')
  const [premiacion, setPremiacion] = useState([])
  const [loadingPremiacion, setLoadingPremiacion] = useState(false)

  const [openEdit, setOpenEdit] = useState(false)
  const [selectedEquipo, setSelectedEquipo] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [equipoToDelete, setEquipoToDelete] = useState({})
  const [loadingDelete, setLoadingDelete] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [newEquipo, setNewEquipo] = useState(EMPTY_EQUIPO)

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const fetchEquipos = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/equipos`)
      const data = await res.json()
      setEquipos(data)
      setEquiposFiltrados(data)
    } catch (err) {
      console.error('Error al cargar equipos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCoaches = async () => {
    try {
      const res = await apiFetch(`/api/coaches`)
      const data = await res.json()
      setCoaches(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar coaches:', err)
    }
  }

  const fetchPremiacion = async () => {
    setLoadingPremiacion(true)
    try {
      const res = await apiFetch(`/api/equipos/premiacion`)
      const data = await res.json()
      setPremiacion(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar premiación:', err)
    } finally {
      setLoadingPremiacion(false)
    }
  }

  useEffect(() => { fetchEquipos(); fetchCoaches() }, [])

  useEffect(() => { if (vista === 'premiacion') fetchPremiacion() }, [vista])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setEquiposFiltrados(equipos)
    } else {
      const q = searchTerm.toLowerCase()
      setEquiposFiltrados(
        equipos.filter(e =>
          e.nombre?.toLowerCase().includes(q) ||
          e.coach?.nombre?.toLowerCase().includes(q)
        )
      )
    }
  }, [searchTerm, equipos])

  const handleEdit = (equipo) => {
    setSelectedEquipo({ ...equipo, coach_id: equipo.coach_id || '' })
    setOpenEdit(true)
  }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    if (!selectedEquipo.nombre?.trim()) { alert('El nombre es obligatorio.'); return }
    setLoadingEdit(true)
    try {
      const res = await apiFetch(`/api/equipos/${selectedEquipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: selectedEquipo.nombre,
          foto: selectedEquipo.foto,
          color: selectedEquipo.color,
          coach_id: selectedEquipo.coach_id || null,
        }),
      })
      if (!res.ok) throw new Error()
      await fetchEquipos()
      setOpenEdit(false)
    } catch (err) {
      console.error('Error al editar equipo:', err)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleCreate = async () => {
    if (loadingCreate) return
    if (!newEquipo.nombre?.trim()) { alert('El nombre es obligatorio.'); return }
    setLoadingCreate(true)
    try {
      const res = await apiFetch(`/api/equipos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newEquipo.nombre,
          foto: newEquipo.foto,
          color: newEquipo.color,
          coach_id: newEquipo.coach_id || null,
        }),
      })
      if (!res.ok) throw new Error()
      await fetchEquipos()
      setOpenCreate(false)
      setNewEquipo(EMPTY_EQUIPO)
    } catch (err) {
      console.error('Error al crear equipo:', err)
      alert('No se pudo crear el equipo.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleDelete = (equipo) => { setEquipoToDelete(equipo); setOpenDelete(true) }

  const confirmDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      const res = await apiFetch(`/api/equipos/${equipoToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      await fetchEquipos()
      setOpenDelete(false)
    } catch (err) {
      console.error('Error al eliminar equipo:', err)
      alert('Hubo un error al eliminar el equipo.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          Equipos
        </Typography>
        {vista === 'equipos' && (
          <Button
            variant="contained"
            startIcon={<GroupAddIcon />}
            onClick={() => setOpenCreate(true)}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 600,
              backgroundColor: '#F57C00', '&:hover': { backgroundColor: '#E65100' },
              px: { xs: 1.5, md: 2.5 }, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Nuevo equipo
          </Button>
        )}
      </Stack>

      <Tabs
        value={vista}
        onChange={(e, v) => setVista(v)}
        sx={{ borderBottom: `1px solid ${border}`, minHeight: 40, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40 }, '& .Mui-selected': { color: '#F57C00 !important' }, '& .MuiTabs-indicator': { backgroundColor: '#F57C00' } }}
      >
        <Tab value="equipos" label="Equipos" icon={<GroupsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab value="premiacion" label="Premiación" icon={<TrophyIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {vista === 'equipos' && (
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por nombre o coach..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ maxWidth: 420 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18 }} style={{ opacity: 0.6 }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 2, backgroundColor: surface },
          }}
        />
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 2 }}>
        {vista === 'premiacion' ? (
          <PremiacionView premiacion={premiacion} isLoading={loadingPremiacion} surface={surface} border={border} isDark={isDark} />
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress size={40} sx={{ color: '#FF9800' }} />
          </Box>
        ) : equiposFiltrados.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1, color: 'text.secondary' }}>
            <GroupsIcon sx={{ fontSize: 56 }} style={{ opacity: 0.4 }} />
            <Typography>No hay equipos cargados.</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2.5,
            }}
          >
            {equiposFiltrados.map((eq) => {
              const color = eq.color || '#9e9e9e'
              return (
                <Card
                  key={eq.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3, overflow: 'hidden', position: 'relative',
                    border: `1px solid ${border}`, backgroundColor: surface,
                    transition: 'transform .15s ease, box-shadow .15s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(0,0,0,0.15)' },
                  }}
                >
                  {/* Banner color */}
                  <Box sx={{ height: 72, background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <CardMenu onEdit={() => handleEdit(eq)} onDelete={() => handleDelete(eq)} />
                    </Box>
                  </Box>

                  {/* Avatar superpuesto */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: '-36px' }}>
                    <Avatar
                      src={eq.foto || undefined}
                      sx={{ width: 72, height: 72, bgcolor: color, border: `4px solid ${surface}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                    >
                      <GroupsIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                  </Box>

                  <CardContent sx={{ textAlign: 'center', pt: 1.5 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {capitalizeWords(eq.nombre)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mt: 1, color: 'text.secondary' }}>
                      <SupervisorAccountIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        {eq.coach?.nombre ? capitalizeWords(eq.coach.nombre) : 'Sin coach'}
                      </Typography>
                    </Stack>
                    {eq.color && (
                      <Chip
                        label={eq.color}
                        size="small"
                        sx={{ mt: 1.5, bgcolor: color, color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
      </Box>

      <GenericModal
        open={openEdit}
        title="Editar equipo"
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        loading={loadingEdit}
      >
        <EquipoForm equipo={selectedEquipo} onChange={setSelectedEquipo} coaches={coaches} />
      </GenericModal>

      <GenericModal
        open={openCreate}
        title="Crear nuevo equipo"
        onClose={() => setOpenCreate(false)}
        onSave={handleCreate}
        loading={loadingCreate}
      >
        <EquipoForm equipo={newEquipo} onChange={setNewEquipo} coaches={coaches} />
      </GenericModal>

      <DeleteGenericModal
        open={openDelete}
        title="Eliminar equipo"
        nombre={equipoToDelete?.nombre}
        descripcion={equipoToDelete?.coach?.nombre ? `Coach: ${equipoToDelete.coach.nombre}` : null}
        onClose={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
        loading={loadingDelete}
      />
    </Box>
  )
}
