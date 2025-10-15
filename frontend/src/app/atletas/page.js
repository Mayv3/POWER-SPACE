'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, Button, Stack } from '@mui/material'
import { GenericDataGrid } from '../../components/GenericDataGrid'
import { columnsAtletas } from '../../const/columns/columnsAtletas'
import { GenericModal } from '../../components/modales/GenericModal'
import { EditAtletaForm } from '../../components/modales/EditAtletaForm'
import { DeleteConfirmModal } from '../../components/modales/DeleteConfirmModal'
import { CreateAtletaForm } from '../../components/modales/CreateAtletaForm'

export default function AtletasPage() {
  const [atletas, setAtletas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [openEdit, setOpenEdit] = useState(false)
  const [selectedAtleta, setSelectedAtleta] = useState({})

  const [openDelete, setOpenDelete] = useState(false)
  const [deleteAtleta, setDeleteAtleta] = useState({})

  const [openCreate, setOpenCreate] = useState(false)
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
  })

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/atletas`)
      const data = await res.json()
      setAtletas(data)
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

  const handleEdit = (atleta) => {
    setSelectedAtleta(atleta)
    setOpenEdit(true)
  }

  const handleSaveEdit = async () => {
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
    }
  }

  const handleCreateAtleta = async () => {
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
      })
    } catch (err) {
      console.error('Error al crear atleta:', err)
      alert('No se pudo crear el atleta.')
    }
  }

  const handleDelete = (atleta) => {
    setDeleteAtleta(atleta)
    setOpenDelete(true)
  }

  const confirmDelete = async () => {
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
          color="primary"
          sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          onClick={() => setOpenCreate(true)}
        >
          Nuevo atleta
        </Button>
      </Stack>

      {/* Tabla */}
      <GenericDataGrid
        rows={atletas}
        columns={columnsAtletas(handleEdit, handleDelete)}
        paginationMode="client"
        rowCount={total}
        loading={isLoading}
      />

      {/* Modal editar */}
      <GenericModal open={openEdit} title="Editar atleta" onClose={() => setOpenEdit(false)} onSave={handleSaveEdit}>
        <EditAtletaForm atleta={selectedAtleta} onChange={setSelectedAtleta} />
      </GenericModal>

      {/* Modal crear */}
      <GenericModal open={openCreate} title="Crear nuevo atleta" onClose={() => setOpenCreate(false)} onSave={handleCreateAtleta}>
        <CreateAtletaForm atleta={newAtleta} onChange={setNewAtleta} />
      </GenericModal>

      {/* Modal eliminar */}
      <DeleteConfirmModal open={openDelete} atleta={deleteAtleta} onClose={() => setOpenDelete(false)} onConfirm={confirmDelete} />
    </Box>
  )
}
