'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogContent, Box, Typography, Stack, TextField, InputAdornment,
  List, ListItemButton, ListItemIcon, ListItemText, Checkbox, Chip, CircularProgress, Avatar,
} from '@mui/material'
import { Search as SearchIcon, Groups as GroupsIcon } from '@mui/icons-material'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'
import { ModalFooterActions } from './ModalFooterActions'
import { apiFetch } from '../../lib/api'
import { capitalizeWords } from '../../utils/textUtils'
import { claveCategoriaAtleta } from '../../const/categorias/categorias'

export function AsignarEquipoModal({ open, equipos, onClose, onAssigned }) {
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [equipoElegidoId, setEquipoElegidoId] = useState(null)

  useEffect(() => {
    if (!open) return
    setSearchTerm('')
    setSeleccionados(new Set())
    setEquipoElegidoId(equipos?.[0]?.id ?? null)
    setLoading(true)
    apiFetch('/api/atletas')
      .then((r) => r.json())
      .then((data) => setAtletas(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error al cargar atletas:', err))
      .finally(() => setLoading(false))
  }, [open, equipos])

  const equipoElegido = useMemo(
    () => equipos?.find((e) => e.id === equipoElegidoId) || null,
    [equipos, equipoElegidoId]
  )

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

  const cambios = useMemo(
    () => [...seleccionados].filter((id) => atletas.find((a) => a.id === id)?.equipo_id !== equipoElegidoId),
    [seleccionados, atletas, equipoElegidoId]
  )

  const handleClose = () => {
    if (guardando) return
    onClose()
  }

  const handleGuardar = async () => {
    if (guardando || cambios.length === 0 || !equipoElegidoId) return
    setGuardando(true)
    try {
      const porId = new Map(atletas.map((a) => [a.id, a]))
      for (const id of cambios) {
        const atleta = porId.get(id)
        if (!atleta) continue
        await apiFetch(`/api/atletas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...atleta, equipo_id: equipoElegidoId }),
        })
      }
      await onAssigned?.()
      onClose()
    } catch (err) {
      console.error('Error al asignar equipo:', err)
      alert('No se pudo guardar la asignación de algún atleta.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      slotProps={{ paper: { sx: modalPaperSx('standard') } }}
    >
      <ModalHeader
        title="Asignar equipo"
        subtitle="Elegí el equipo y seleccioná los atletas a los que se les va a asignar."
        onClose={handleClose}
        disabled={guardando}
      />
      <DialogContent dividers sx={modalContentSx}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {(equipos || []).map((e) => (
              <Chip
                key={e.id}
                label={capitalizeWords(e.nombre || '')}
                onClick={() => setEquipoElegidoId(e.id)}
                sx={{
                  fontWeight: 700,
                  bgcolor: equipoElegidoId === e.id ? (e.color || '#616161') : 'transparent',
                  color: equipoElegidoId === e.id ? '#fff' : 'text.primary',
                  border: `1px solid ${e.color || '#616161'}`,
                }}
              />
            ))}
          </Stack>

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
            {cambios.length > 0 && equipoElegido && (
              <Typography variant="caption" color="text.secondary">
                {cambios.length} cambian a {capitalizeWords(equipoElegido.nombre || '')}
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
                const equipoActual = a.equipo
                const colorActual = equipoActual?.color || '#616161'
                const bloqueado = Boolean(equipoActual && a.equipo_id !== equipoElegidoId)
                return (
                  <ListItemButton
                    key={a.id}
                    onClick={() => !bloqueado && toggle(a.id)}
                    disabled={bloqueado}
                    dense
                    divider
                    sx={checked && equipoElegido ? {
                      bgcolor: `${equipoElegido.color || '#616161'}26`,
                      borderLeft: `4px solid ${equipoElegido.color || '#616161'}`,
                      '&:hover': { bgcolor: `${equipoElegido.color || '#616161'}3d` },
                    } : { borderLeft: '4px solid transparent' }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" checked={checked} disabled={bloqueado} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={capitalizeWords(`${a.nombre} ${a.apellido}`)}
                      secondary={`DNI ${a.dni || '—'} · ${claveCategoriaAtleta(a)}`}
                    />
                    {checked && equipoElegido ? (
                      <Chip
                        size="small"
                        avatar={<Avatar src={equipoElegido.foto || undefined}><GroupsIcon sx={{ fontSize: 14 }} /></Avatar>}
                        label={`→ ${capitalizeWords(equipoElegido.nombre || '')}`}
                        sx={{ ml: 1, bgcolor: equipoElegido.color || '#616161', color: '#fff', fontWeight: 700 }}
                      />
                    ) : bloqueado ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Ya en ${capitalizeWords(equipoActual.nombre || '')}`}
                        sx={{ ml: 1, borderColor: colorActual, color: colorActual, fontWeight: 700 }}
                      />
                    ) : equipoActual ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={capitalizeWords(equipoActual.nombre || '')}
                        sx={{ ml: 1, borderColor: colorActual, color: colorActual, fontWeight: 700 }}
                      />
                    ) : null}
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
            label: guardando ? 'Guardando...' : `Guardar${cambios.length ? ` (${cambios.length})` : ''}`,
            onClick: handleGuardar,
            loading: guardando,
            disabled: cambios.length === 0 || guardando || !equipoElegidoId,
          },
        ]}
      />
    </Dialog>
  )
}
