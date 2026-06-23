'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, InputAdornment,
  CircularProgress, Card, CardContent, Avatar, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material'
import { Search as SearchIcon, PersonAdd as PersonAddIcon, SupervisorAccount as SupervisorAccountIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { GenericModal } from '../../../components/modales/GenericModal'
import { CoachForm } from '../../../components/modales/CoachForm'
import { DeleteGenericModal } from '../../../components/modales/DeleteGenericModal'
import { useDarkMode } from '../../../context/ThemeContext'
import { capitalizeWords } from '../../../utils/textUtils'

const COLORES = ['#F57C00', '#1976d2', '#388e3c', '#7b1fa2', '#d32f2f', '#0097a7']

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

export default function CoachesPage() {
  const [coaches, setCoaches] = useState([])
  const [coachesFiltrados, setCoachesFiltrados] = useState([])
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
  const [newCoach, setNewCoach] = useState({ nombre: '', foto: null })

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const fetchCoaches = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaches`)
      const data = await res.json()
      setCoaches(data)
      setCoachesFiltrados(data)
    } catch (err) {
      console.error('Error al cargar coaches:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCoaches() }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setCoachesFiltrados(coaches)
    } else {
      const q = searchTerm.toLowerCase()
      setCoachesFiltrados(coaches.filter(c => c.nombre?.toLowerCase().includes(q)))
    }
  }, [searchTerm, coaches])

  const handleEdit = (coach) => { setSelectedCoach(coach); setOpenEdit(true) }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    setLoadingEdit(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaches/${selectedCoach.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedCoach),
      })
      if (!res.ok) throw new Error()
      await fetchCoaches()
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoach),
      })
      if (!res.ok) throw new Error()
      await fetchCoaches()
      setOpenCreate(false)
      setNewCoach({ nombre: '', foto: null })
    } catch (err) {
      console.error('Error al crear coach:', err)
      alert('No se pudo crear el coach.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleDelete = (coach) => { setCoachToDelete(coach); setOpenDelete(true) }

  const confirmDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coaches/${coachToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      await fetchCoaches()
      setOpenDelete(false)
    } catch (err) {
      console.error('Error al eliminar coach:', err)
      alert('Hubo un error al eliminar el coach.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          Coaches
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenCreate(true)}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 600,
            backgroundColor: '#F57C00', '&:hover': { backgroundColor: '#E65100' },
            px: { xs: 1.5, md: 2.5 }, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Nuevo coach
        </Button>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por nombre..."
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2.5,
            }}
          >
            {coachesFiltrados.map((c) => {
              const color = colorPorId(c.id)
              return (
                <Card
                  key={c.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3, position: 'relative',
                    border: `1px solid ${border}`, backgroundColor: surface,
                    transition: 'transform .15s ease, box-shadow .15s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(0,0,0,0.15)' },
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                    <CardMenu onEdit={() => handleEdit(c)} onDelete={() => handleDelete(c)} />
                  </Box>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 3 }}>
                    <Avatar src={c.foto || undefined} sx={{ width: 72, height: 72, bgcolor: color, fontSize: '1.6rem', fontWeight: 700, mb: 1.5 }}>
                      {iniciales(c.nombre)}
                    </Avatar>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {capitalizeWords(c.nombre)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mt: 0.5, color: 'text.secondary' }}>
                      <SupervisorAccountIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">Coach</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
      </Box>

      <GenericModal
        open={openEdit}
        title="Editar coach"
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        loading={loadingEdit}
      >
        <CoachForm coach={selectedCoach} onChange={setSelectedCoach} />
      </GenericModal>

      <GenericModal
        open={openCreate}
        title="Crear nuevo coach"
        onClose={() => setOpenCreate(false)}
        onSave={handleCreate}
        loading={loadingCreate}
      >
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
