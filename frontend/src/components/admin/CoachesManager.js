'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, InputAdornment,
  CircularProgress, Avatar, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import {
  Search as SearchIcon, PersonAdd as PersonAddIcon,
  SupervisorAccount as SupervisorAccountIcon, MoreVert as MoreVertIcon,
  Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material'
import { GenericModal } from '../modales/GenericModal'
import { CoachForm } from '../modales/CoachForm'
import { DeleteGenericModal } from '../modales/DeleteGenericModal'
import { useDarkMode } from '../../context/ThemeContext'
import { capitalizeWords } from '../../utils/textUtils'
import { apiFetch } from '../../lib/api'

const COLORES = ['#F57C00', '#1976d2', '#388e3c', '#7b1fa2', '#d32f2f', '#0097a7']
const EMPTY_COACH = { nombre: '', foto: null }

function iniciales(nombre) {
  if (!nombre) return '?'
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function colorPorId(id) {
  return COLORES[Number(id) % COLORES.length]
}

function CardMenu({ onEdit, onDelete }) {
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}>
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

export function CoachesManager({ onCoachesChange }) {
  const [coaches, setCoaches] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [openEdit, setOpenEdit] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [coachToDelete, setCoachToDelete] = useState({})
  const [loadingDelete, setLoadingDelete] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [newCoach, setNewCoach] = useState(EMPTY_COACH)

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const fetchCoaches = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/api/coaches')
      const data = await res.json()
      setCoaches(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar coaches:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCoaches() }, [])

  const coachesFiltrados = searchTerm.trim()
    ? coaches.filter(c => c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
    : coaches

  const notificarCambio = async () => {
    await fetchCoaches()
    await onCoachesChange?.()
  }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    if (!selectedCoach.nombre?.trim()) { alert('El nombre es obligatorio.'); return }
    setLoadingEdit(true)
    try {
      await apiFetch(`/api/coaches/${selectedCoach.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedCoach),
      })
      await notificarCambio()
      setOpenEdit(false)
    } catch (err) {
      console.error('Error al editar coach:', err)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleCreate = async () => {
    if (loadingCreate) return
    if (!newCoach.nombre?.trim()) { alert('El nombre es obligatorio.'); return }
    setLoadingCreate(true)
    try {
      await apiFetch('/api/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoach),
      })
      await notificarCambio()
      setOpenCreate(false)
      setNewCoach(EMPTY_COACH)
    } catch (err) {
      console.error('Error al crear coach:', err)
      alert('No se pudo crear el coach.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const confirmDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      await apiFetch(`/api/coaches/${coachToDelete.id}`, { method: 'DELETE' })
      await notificarCambio()
      setOpenDelete(false)
    } catch (err) {
      console.error('Error al eliminar coach:', err)
      alert('Hubo un error al eliminar el coach.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 164px', minHeight: 70,
          bgcolor: isDark ? '#111d18' : '#f5faf7',
          border: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
          borderBottom: 0, borderRadius: '12px 12px 0 0', overflow: 'hidden',
        }}
      >
        <Box sx={{ minWidth: 0, px: 1.5, py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Nombre del coach..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#8aa9a0' }} />
                </InputAdornment>
              ),
              sx: { fontSize: '0.9rem', fontWeight: 700 },
            }}
          />
        </Box>
        <Button
          onClick={() => setOpenCreate(true)}
          sx={{
            borderRadius: 0, borderLeft: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
            color: '#F57C00', textTransform: 'none',
            '&:hover': { bgcolor: isDark ? 'rgba(245,124,0,.09)' : 'rgba(245,124,0,.07)' },
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center">
            <PersonAddIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>Nuevo coach</Typography>
          </Stack>
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress size={40} sx={{ color: '#FF9800' }} />
          </Box>
        ) : coachesFiltrados.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1, color: 'text.secondary' }}>
            <SupervisorAccountIcon sx={{ fontSize: 56 }} style={{ opacity: 0.4 }} />
            <Typography>No hay coaches cargados.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ border: `1px solid ${border}`, borderRadius: '0 0 12px 12px', backgroundColor: surface, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? '#111d18' : '#f5faf7' }}>
                  <TableCell sx={{ color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Coach</TableCell>
                  <TableCell sx={{ color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Imagen</TableCell>
                  <TableCell align="right" sx={{ width: 72, color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coachesFiltrados.map((coach) => {
                  const color = colorPorId(coach.id)
                  return (
                    <TableRow key={coach.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Avatar src={coach.foto || undefined} sx={{ width: 38, height: 38, bgcolor: color, fontSize: '0.85rem', fontWeight: 800 }}>
                            {iniciales(coach.nombre)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={800}>{capitalizeWords(coach.nombre)}</Typography>
                            <Typography variant="caption" color="text.secondary">Coach</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={coach.foto ? 'text.primary' : 'text.secondary'}>
                          {coach.foto ? 'Personalizada' : 'Iniciales automáticas'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <CardMenu
                            onEdit={() => { setSelectedCoach(coach); setOpenEdit(true) }}
                            onDelete={() => { setCoachToDelete(coach); setOpenDelete(true) }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <GenericModal open={openEdit} title="Editar coach" subtitle="Actualizá su nombre y foto de perfil." onClose={() => setOpenEdit(false)} onSave={handleSaveEdit} loading={loadingEdit} saveDisabled={!selectedCoach.nombre?.trim()}>
        <CoachForm coach={selectedCoach} onChange={setSelectedCoach} />
      </GenericModal>

      <GenericModal open={openCreate} title="Crear nuevo coach" subtitle="Cargá los datos principales del responsable." onClose={() => setOpenCreate(false)} onSave={handleCreate} loading={loadingCreate} saveDisabled={!newCoach.nombre?.trim()}>
        <CoachForm coach={newCoach} onChange={setNewCoach} />
      </GenericModal>

      <DeleteGenericModal
        open={openDelete}
        title="Eliminar coach"
        nombre={coachToDelete?.nombre}
        onClose={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
        loading={loadingDelete}
      />
    </Box>
  )
}
