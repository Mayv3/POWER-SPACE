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
import { TANDA_IDS, letraTanda } from '../../const/tandas'

const TANDA_COLORS = { 1: '#1976d2', 2: '#388e3c', 3: '#F57C00', 4: '#7b1fa2', 5: '#00838f', 6: '#c2185b', 7: '#5d4037' }

export function AsignarTandaModal({ open, onClose, onAssigned }) {
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [tandaElegida, setTandaElegida] = useState(1)

  useEffect(() => {
    if (!open) return
    setSearchTerm('')
    setSeleccionados(new Set())
    setTandaElegida(1)
    setLoading(true)
    apiFetch('/api/atletas')
      .then((r) => r.json())
      .then((data) => setAtletas(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error al cargar atletas:', err))
      .finally(() => setLoading(false))
  }, [open])

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
    () => [...seleccionados].filter((id) => atletas.find((a) => a.id === id)?.tanda_id !== tandaElegida),
    [seleccionados, atletas, tandaElegida]
  )

  const handleClose = () => {
    if (guardando) return
    onClose()
  }

  const handleGuardar = async () => {
    if (guardando || cambios.length === 0) return
    setGuardando(true)
    try {
      const porId = new Map(atletas.map((a) => [a.id, a]))
      for (const id of cambios) {
        const atleta = porId.get(id)
        if (!atleta) continue
        await apiFetch(`/api/atletas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...atleta, tanda_id: tandaElegida }),
        })
      }
      await onAssigned?.()
      onClose()
    } catch (err) {
      console.error('Error al asignar tanda:', err)
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
        title="Asignar tanda"
        subtitle="Elegí la tanda y seleccioná los atletas a los que se les va a asignar."
        onClose={handleClose}
        disabled={guardando}
      />
      <DialogContent dividers sx={modalContentSx}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {TANDA_IDS.map((id) => (
              <Chip
                key={id}
                label={`Tanda ${letraTanda(id)}`}
                onClick={() => setTandaElegida(id)}
                sx={{
                  fontWeight: 700,
                  bgcolor: tandaElegida === id ? TANDA_COLORS[id] : 'transparent',
                  color: tandaElegida === id ? '#fff' : 'text.primary',
                  border: `1px solid ${TANDA_COLORS[id]}`,
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
            {cambios.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {cambios.length} cambian a Tanda {letraTanda(tandaElegida)}
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
                return (
                  <ListItemButton
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    dense
                    divider
                    sx={checked ? {
                      bgcolor: `${TANDA_COLORS[tandaElegida]}26`,
                      borderLeft: `4px solid ${TANDA_COLORS[tandaElegida]}`,
                      '&:hover': { bgcolor: `${TANDA_COLORS[tandaElegida]}3d` },
                    } : { borderLeft: '4px solid transparent' }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={capitalizeWords(`${a.nombre} ${a.apellido}`)}
                      secondary={`DNI ${a.dni || '—'} · ${claveCategoriaAtleta(a)}`}
                    />
                    {checked ? (
                      <Chip
                        size="small"
                        label={`→ Tanda ${letraTanda(tandaElegida)}`}
                        sx={{ ml: 1, bgcolor: TANDA_COLORS[tandaElegida], color: '#fff', fontWeight: 700 }}
                      />
                    ) : a.tanda_id ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Tanda ${letraTanda(a.tanda_id)}`}
                        sx={{ ml: 1, borderColor: TANDA_COLORS[a.tanda_id], color: TANDA_COLORS[a.tanda_id], fontWeight: 700 }}
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
            disabled: cambios.length === 0 || guardando,
          },
        ]}
      />
    </Dialog>
  )
}
