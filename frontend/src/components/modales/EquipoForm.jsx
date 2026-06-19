'use client'

import { useState } from 'react'
import {
  Box, Stack, TextField, MenuItem, Typography, Avatar, Button,
  CircularProgress, IconButton,
} from '@mui/material'
import { Camera as PhotoCameraIcon, UsersThree as GroupsIcon, Trash as DeleteOutlineIcon } from '@phosphor-icons/react'
import { capitalizeWords } from '../../utils/textUtils'
import { supabase } from '../../lib/supabaseClient'

const COLORES = ['#F57C00', '#1976d2', '#388e3c', '#7b1fa2', '#d32f2f', '#0097a7', '#fbc02d', '#212121']

export function EquipoForm({ equipo, onChange, coaches = [] }) {
  const [uploading, setUploading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'nombre') {
      onChange({ ...equipo, nombre: capitalizeWords(value) })
    } else {
      onChange({ ...equipo, [name]: value })
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `equipos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('equipos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('equipos').getPublicUrl(path)
      onChange({ ...equipo, foto: data.publicUrl })
    } catch (err) {
      console.error('Error al subir foto:', err)
      alert('No se pudo subir la foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box component="form" sx={{ width: '100%', mt: 1 }}>
      {/* Foto */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Avatar
          src={equipo.foto || undefined}
          sx={{ width: 72, height: 72, bgcolor: equipo.color || '#bdbdbd' }}
        >
          <GroupsIcon />
        </Avatar>
        <Box>
          <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={uploading ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
            disabled={uploading}
            sx={{ textTransform: 'none' }}
          >
            {uploading ? 'Subiendo...' : (equipo.foto ? 'Cambiar foto' : 'Subir foto')}
            <input hidden type="file" accept="image/*" onChange={handleFile} />
          </Button>
          {equipo.foto && (
            <IconButton
              size="small"
              color="error"
              onClick={() => onChange({ ...equipo, foto: null })}
              sx={{ ml: 1 }}
            >
              <DeleteOutlineIcon size={20} />
            </IconButton>
          )}
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            Opcional
          </Typography>
        </Box>
      </Stack>

      {/* Nombre */}
      <TextField
        fullWidth
        name="nombre"
        label="Nombre del equipo"
        value={equipo.nombre || ''}
        onChange={handleChange}
        sx={{ mb: 3 }}
      />

      {/* Color */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Color
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {COLORES.map((c) => (
          <Box
            key={c}
            onClick={() => onChange({ ...equipo, color: c })}
            sx={{
              width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
              border: equipo.color === c ? '3px solid #000' : '2px solid rgba(0,0,0,0.15)',
              boxShadow: equipo.color === c ? '0 0 0 2px #fff inset' : 'none',
            }}
          />
        ))}
        <Box
          component="input"
          type="color"
          value={equipo.color || '#F57C00'}
          onChange={(e) => onChange({ ...equipo, color: e.target.value })}
          sx={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', p: 0 }}
        />
        <TextField
          size="small"
          name="color"
          value={equipo.color || ''}
          onChange={handleChange}
          placeholder="#F57C00"
          sx={{ width: 110 }}
        />
      </Stack>

      {/* Coach */}
      <TextField
        select
        fullWidth
        name="coach_id"
        label="Coach encargado"
        value={equipo.coach_id || ''}
        onChange={handleChange}
        helperText={coaches.length === 0 ? 'No hay coaches cargados todavía' : ' '}
      >
        <MenuItem value="">
          <em>Sin coach</em>
        </MenuItem>
        {coaches.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {capitalizeWords(c.nombre)}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  )
}
