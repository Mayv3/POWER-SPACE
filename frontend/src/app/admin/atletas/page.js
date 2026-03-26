'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, InputAdornment,
  CircularProgress, Paper, Divider,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import GroupIcon from '@mui/icons-material/Group'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { columnsAtletas } from '../../../const/columns/columnsAtletas'
import { GenericModal } from '../../../components/modales/GenericModal'
import { EditAtletaForm } from '../../../components/modales/EditAtletaForm'
import { DeleteConfirmModal } from '../../../components/modales/DeleteConfirmModal'
import { CreateAtletaForm } from '../../../components/modales/CreateAtletaForm'
import { useDarkMode } from '../../../context/ThemeContext'

export default function AtletasPage() {
  const [atletas, setAtletas] = useState([])
  const [atletasFiltrados, setAtletasFiltrados] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [openEdit, setOpenEdit] = useState(false)
  const [selectedAtleta, setSelectedAtleta] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [deleteAtleta, setDeleteAtleta] = useState({})
  const [loadingDelete, setLoadingDelete] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [newAtleta, setNewAtleta] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    fecha_nacimiento: '',
    edad: '',
    categoria: '',
    peso_corporal: '',
    modalidad: '',
    tanda_id: null,
    primer_intento_sentadilla: null,
    primer_intento_banco: null,
    primer_intento_peso_muerto: null,
    sexo: '',
    altura_rack_sentadilla: null,
    altura_rack_banco: null,
  })

  const { isDark } = useDarkMode()
  const surface = isDark ? '#1a1a1a' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e0e0e0'

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas`)
      const data = await res.json()
      setAtletas(data)
      setAtletasFiltrados(data)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAtletas() }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setAtletasFiltrados(atletas)
    } else {
      const q = searchTerm.toLowerCase()
      setAtletasFiltrados(
        atletas.filter(a =>
          a.nombre?.toLowerCase().includes(q) ||
          a.apellido?.toLowerCase().includes(q)
        )
      )
    }
  }, [searchTerm, atletas])

  const handleEdit = (atleta) => { setSelectedAtleta(atleta); setOpenEdit(true) }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    setLoadingEdit(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${selectedAtleta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedAtleta),
      })
      if (!res.ok) throw new Error()
      await fetchAtletas()
      setOpenEdit(false)
    } catch (err) {
      console.error('Error al editar atleta:', err)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleCreateAtleta = async () => {
    if (loadingCreate) return
    setLoadingCreate(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAtleta),
      })
      if (!res.ok) throw new Error()
      await fetchAtletas()
      setOpenCreate(false)
      setNewAtleta({
        nombre: '', apellido: '', dni: '', fecha_nacimiento: '', edad: '',
        categoria: '', peso_corporal: '', modalidad: '', tanda_id: null,
        primer_intento_sentadilla: null, primer_intento_banco: null,
        primer_intento_peso_muerto: null, sexo: '',
        altura_rack_sentadilla: null, altura_rack_banco: null,
      })
    } catch (err) {
      console.error('Error al crear atleta:', err)
      alert('No se pudo crear el atleta.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleDelete = (atleta) => { setDeleteAtleta(atleta); setOpenDelete(true) }

  const confirmDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${deleteAtleta.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      await fetchAtletas()
      setOpenDelete(false)
    } catch (err) {
      console.error('Error al eliminar atleta:', err)
      alert('Hubo un error al eliminar el atleta.')
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Atletas
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5 }}>
            <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {atletasFiltrados.length} {atletasFiltrados.length === 1 ? 'atleta' : 'atletas'}
              {searchTerm && ` encontrados`}
            </Typography>
          </Stack>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenCreate(true)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: '#F57C00',
            '&:hover': { backgroundColor: '#E65100' },
            px: 2.5,
          }}
        >
          Nuevo atleta
        </Button>
      </Stack>

      {/* Buscador + Tabla */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${border}`,
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: surface,
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre o apellido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: border }} />

        <Box sx={{ flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress size={40} sx={{ color: '#FF9800' }} />
            </Box>
          ) : (
            <GenericDataGrid
              rows={atletasFiltrados}
              columns={columnsAtletas(handleEdit, handleDelete)}
              paginationMode="client"
              rowCount={atletasFiltrados.length}
              getRowClassName={(params) => params.row.tanda_id ? `row-tanda-${params.row.tanda_id}` : ''}
              loading={isLoading}
            />
          )}
        </Box>
      </Paper>

      {/* Modal editar */}
      <GenericModal
        open={openEdit}
        title="Editar atleta"
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        loading={loadingEdit}
      >
        <EditAtletaForm atleta={selectedAtleta} onChange={setSelectedAtleta} />
      </GenericModal>

      {/* Modal crear */}
      <GenericModal
        open={openCreate}
        title="Crear nuevo atleta"
        onClose={() => setOpenCreate(false)}
        onSave={handleCreateAtleta}
        loading={loadingCreate}
      >
        <CreateAtletaForm atleta={newAtleta} onChange={setNewAtleta} />
      </GenericModal>

      {/* Modal eliminar */}
      <DeleteConfirmModal
        open={openDelete}
        atleta={deleteAtleta}
        onClose={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
        loading={loadingDelete}
      />
    </Box>
  )
}
