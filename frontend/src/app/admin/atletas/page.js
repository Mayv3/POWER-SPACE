'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, Button, Stack, TextField, InputAdornment, CircularProgress } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { columnsAtletas } from '../../../const/columns/columnsAtletas'
import { GenericModal } from '../../../components/modales/GenericModal'
import { EditAtletaForm } from '../../../components/modales/EditAtletaForm'
import { DeleteConfirmModal } from '../../../components/modales/DeleteConfirmModal'
import { CreateAtletaForm } from '../../../components/modales/CreateAtletaForm'

export default function AtletasPage() {
  const [atletas, setAtletas] = useState([])
  const [atletasFiltrados, setAtletasFiltrados] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

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



  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas`)
      const data = await res.json()
      setAtletas(data)
      setAtletasFiltrados(data)
      console.log(data)
      setTotal(data.length)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAtletas()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setAtletasFiltrados(atletas)
    } else {
      const filtered = atletas.filter(atleta =>
        atleta.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        atleta.apellido?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setAtletasFiltrados(filtered)
    }
  }, [searchTerm, atletas])

  const handleEdit = (atleta) => {
    setSelectedAtleta(atleta)
    setOpenEdit(true)
  }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    setLoadingEdit(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${selectedAtleta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedAtleta),
      })
      if (!res.ok) throw new Error('Error al actualizar atleta')
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

      if (!res.ok) throw new Error('Error al crear atleta')
      await fetchAtletas()
      setOpenCreate(false)
      setNewAtleta({
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
    } catch (err) {
      console.error('Error al crear atleta:', err)
      alert('No se pudo crear el atleta.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleDelete = (atleta) => {
    setDeleteAtleta(atleta)
    setOpenDelete(true)
  }

  const confirmDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas/${deleteAtleta.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar atleta')
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Atletas
        </Typography>
        <Button
          variant="contained"
          sx={{ 
            borderRadius: 1, 
            textTransform: 'none', 
            fontWeight: 600,
            backgroundColor: '#F57C00',
            '&:hover': {
              backgroundColor: '#FF9800'
            }
          }}
          onClick={() => setOpenCreate(true)}
        >
          Nuevo atleta
        </Button>
      </Stack>

      <TextField
        fullWidth
        placeholder="Buscar por nombre o apellido..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Tabla */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress size={50} sx={{ color: '#FF9800' }} />
        </Box>
      ) : (
        <GenericDataGrid
          rows={atletasFiltrados}
          columns={columnsAtletas(handleEdit, handleDelete)}
          paginationMode="client"
          rowCount={total}
          loading={isLoading}
          initialState={{
            sorting: {
              sortModel: [{ field: 'tanda_id', sort: 'asc' }]
            }
          }}
        />
      )}

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
