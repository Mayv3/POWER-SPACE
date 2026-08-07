'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, InputAdornment,
  CircularProgress, Paper, useMediaQuery, useTheme,
} from '@mui/material'
import { Search as SearchIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material'
import { UploadSimple as UploadIcon, DownloadSimple as DownloadIcon } from '@phosphor-icons/react'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { columnsAtletas } from '../../../const/columns/columnsAtletas'
import { GenericModal } from '../../../components/modales/GenericModal'
import { EditAtletaForm } from '../../../components/modales/EditAtletaForm'
import { DeleteConfirmModal } from '../../../components/modales/DeleteConfirmModal'
import { CreateAtletaForm } from '../../../components/modales/CreateAtletaForm'
import { ImportAtletasModal } from '../../../components/modales/ImportAtletasModal'
import { isAtletaFormValid } from '../../../components/modales/AtletaForm'
import { useDarkMode } from '../../../context/ThemeContext'
import { apiFetch } from '../../../lib/api'
import { descargarPlantillaAtletas } from '../../../lib/atletasImport'

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
    categoria_edad: [],
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
    equipo_id: null,
    foto: null,
    descalificado: false,
  })

  const [equipos, setEquipos] = useState([])
  const [openImport, setOpenImport] = useState(false)

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/atletas`)
      const data = await res.json()
      setAtletas(data)
      setAtletasFiltrados(data)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEquipos = async () => {
    try {
      const res = await apiFetch(`/api/equipos`)
      const data = await res.json()
      setEquipos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar equipos:', err)
    }
  }

  useEffect(() => { fetchAtletas(); fetchEquipos() }, [])

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

  const handleEdit = (atleta) => {
    setSelectedAtleta({
      ...atleta,
      modalidad: atleta.modalidad === 'Classic Raw' ? 'Powerlifting' : atleta.modalidad,
    })
    setOpenEdit(true)
  }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    setLoadingEdit(true)
    try {
      const res = await apiFetch(`/api/atletas/${selectedAtleta.id}`, {
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
      const res = await apiFetch(`/api/atletas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAtleta),
      })
      if (!res.ok) throw new Error()
      await fetchAtletas()
      setOpenCreate(false)
      setNewAtleta({
        nombre: '', apellido: '', dni: '', fecha_nacimiento: '', edad: '',
        categoria_edad: [], categoria: '', peso_corporal: '', modalidad: '', tanda_id: null,
        primer_intento_sentadilla: null, primer_intento_banco: null,
        primer_intento_peso_muerto: null, sexo: '',
        altura_rack_sentadilla: null, altura_rack_banco: null, equipo_id: null,
        foto: null, descalificado: false,
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
      const res = await apiFetch(`/api/atletas/${deleteAtleta.id}`, {
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
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>

      {/* Buscador + Tabla */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'visible',
          backgroundColor: 'transparent',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr) 140px', sm: 'minmax(0, 1fr) 460px' },
            minHeight: { xs: 62, sm: 70 },
            bgcolor: isDark ? '#111d18' : '#f5faf7',
            border: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
            borderBottom: 0,
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ minWidth: 0, px: 1.5, py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Nombre o apellido..."
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
          <Stack direction="row" sx={{ borderLeft: `1px solid ${isDark ? '#244238' : '#d6e7df'}` }}>
            <Button
              onClick={() => descargarPlantillaAtletas()}
              sx={{
                borderRadius: 0,
                borderRight: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
                color: 'text.secondary',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                minWidth: { xs: 44, sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' },
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <DownloadIcon size={20} />
                {!isMobile && (
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>
                    Plantilla
                  </Typography>
                )}
              </Stack>
            </Button>
            <Button
              onClick={() => setOpenImport(true)}
              sx={{
                borderRadius: 0,
                borderRight: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
                color: 'text.secondary',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                minWidth: { xs: 44, sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' },
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <UploadIcon size={20} />
                {!isMobile && (
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>
                    Importar Excel
                  </Typography>
                )}
              </Stack>
            </Button>
            <Button
              onClick={() => setOpenCreate(true)}
              sx={{
                borderRadius: 0,
                color: '#F57C00',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: isDark ? 'rgba(245,124,0,.09)' : 'rgba(245,124,0,.07)' },
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <PersonAddIcon sx={{ fontSize: 20 }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>
                  {isMobile ? 'Nuevo' : 'Nuevo atleta'}
                </Typography>
              </Stack>
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            border: `1px solid ${border}`,
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
            backgroundColor: surface,
          }}
        >
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
              columnVisibilityModel={isMobile ? {
                lot: false,
                tanda_id: false,
                equipo: false,
                categoria_edad: false,
                primer_intento_sentadilla: false,
                primer_intento_banco: false,
                primer_intento_peso_muerto: false,
              } : undefined}
            />
          )}
        </Box>
      </Paper>

      {/* Modal editar */}
      <GenericModal
        open={openEdit}
        title="Editar atleta"
        subtitle="Actualizá sus datos, clasificación y configuración de competencia."
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        loading={loadingEdit}
        size="wide"
        saveDisabled={!isAtletaFormValid(selectedAtleta)}
      >
        <EditAtletaForm atleta={selectedAtleta} onChange={setSelectedAtleta} equipos={equipos} />
      </GenericModal>

      {/* Modal crear */}
      <GenericModal
        open={openCreate}
        title="Crear nuevo atleta"
        subtitle="Completá los datos principales y su configuración para competir."
        onClose={() => setOpenCreate(false)}
        onSave={handleCreateAtleta}
        loading={loadingCreate}
        size="wide"
        saveDisabled={!isAtletaFormValid(newAtleta)}
      >
        <CreateAtletaForm atleta={newAtleta} onChange={setNewAtleta} equipos={equipos} />
      </GenericModal>

      {/* Modal importar Excel */}
      <ImportAtletasModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImported={fetchAtletas}
      />

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
