'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogContent, Box, Typography, Stack, TextField, InputAdornment,
  List, ListItemButton, ListItemIcon, ListItemText, Checkbox, Chip, CircularProgress,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'
import { ModalFooterActions } from './ModalFooterActions'
import { apiFetch } from '../../lib/api'
import { capitalizeWords } from '../../utils/textUtils'
import { claveCategoriaAtleta } from '../../const/categorias/categorias'

export function AsignarAtletasModal({ open, equipo, onClose, onAssigned }) {
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [originales, setOriginales] = useState(new Set())

  useEffect(() => {
    if (!open || !equipo) return
    setSearchTerm('')
    setLoading(true)
    apiFetch('/api/atletas')
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : []
        setAtletas(lista)
        const propios = new Set(lista.filter((a) => a.equipo_id === equipo.id).map((a) => a.id))
        setSeleccionados(new Set(propios))
        setOriginales(propios)
      })
      .catch((err) => console.error('Error al cargar atletas:', err))
      .finally(() => setLoading(false))
  }, [open, equipo])

  const filtrados = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return atletas
    return atletas.filter((a) =>
      `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
      a.dni?.toLowerCase().includes(q)
    )
  }, [atletas, searchTerm])

  const toggle = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const cambios = useMemo(() => {
    const aAsignar = [...seleccionados].filter((id) => !originales.has(id))
    const aQuitar = [...originales].filter((id) => !seleccionados.has(id))
    return { aAsignar, aQuitar }
  }, [seleccionados, originales])

  const totalCambios = cambios.aAsignar.length + cambios.aQuitar.length

  const handleClose = () => {
    if (guardando) return
    onClose()
  }

  const handleGuardar = async () => {
    if (guardando || totalCambios === 0) return
    setGuardando(true)
    try {
      const porId = new Map(atletas.map((a) => [a.id, a]))
      const tareas = [
        ...cambios.aAsignar.map((id) => ({ id, equipo_id: equipo.id })),
        ...cambios.aQuitar.map((id) => ({ id, equipo_id: null })),
      ]
      for (const { id, equipo_id } of tareas) {
        const atleta = porId.get(id)
        if (!atleta) continue
        await apiFetch(`/api/atletas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...atleta, equipo_id }),
        })
      }
      await onAssigned?.()
      onClose()
    } catch (err) {
      console.error('Error al asignar atletas:', err)
      alert('No se pudo guardar la asignación de algún atleta.')
    } finally {
      setGuardando(false)
    }
  }

  if (!equipo) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      slotProps={{ paper: { sx: modalPaperSx('standard') } }}
    >
      <ModalHeader
        title={`Asignar atletas — ${capitalizeWords(equipo.nombre || '')}`}
        subtitle="Seleccioná los atletas que pertenecen a este equipo."
        onClose={handleClose}
        disabled={guardando}
      />
      <DialogContent dividers sx={modalContentSx}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" color="primary" label={`${seleccionados.size} seleccionados`} />
            {totalCambios > 0 && (
              <Typography variant="caption" color="text.secondary">
                {cambios.aAsignar.length} nuevos · {cambios.aQuitar.length} se quitan
              </Typography>
            )}
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#F57C00' }} />
            </Box>
          ) : filtrados.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No hay atletas que coincidan.
            </Typography>
          ) : (
            <List sx={{ maxHeight: 420, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, py: 0 }}>
              {filtrados.map((a) => {
                const checked = seleccionados.has(a.id)
                const otroEquipo = a.equipo_id && a.equipo_id !== equipo.id ? a.equipo?.nombre : null
                const bloqueado = Boolean(otroEquipo)
                return (
                  <ListItemButton
                    key={a.id}
                    onClick={() => !bloqueado && toggle(a.id)}
                    disabled={bloqueado}
                    dense
                    divider
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" checked={checked} disabled={bloqueado} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={capitalizeWords(`${a.nombre} ${a.apellido}`)}
                      secondary={`DNI ${a.dni || '—'} · ${claveCategoriaAtleta(a)}`}
                    />
                    {otroEquipo && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Ya en ${capitalizeWords(otroEquipo)}`}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </ListItemButton>
                )
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      <ModalFooterActions
        actions={[
          { label: 'Cancelar', tone: 'neutral', onClick: handleClose, disabled: guardando },
          {
            label: guardando ? 'Guardando...' : `Guardar${totalCambios ? ` (${totalCambios})` : ''}`,
            onClick: handleGuardar,
            loading: guardando,
            disabled: totalCambios === 0 || guardando,
          },
        ]}
      />
    </Dialog>
  )
}
