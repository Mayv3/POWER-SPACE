'use client'

import { useState } from 'react'
import {
  Box, Stack, TextField, Avatar, Button, CircularProgress, IconButton, Typography,
} from '@mui/material'
import { Camera as PhotoCameraIcon, Trash as DeleteOutlineIcon, User as PersonIcon } from '@phosphor-icons/react'
import { capitalizeWords } from '../../utils/textUtils'
import { supabase } from '../../lib/supabaseClient'

export function CoachForm({ coach, onChange }) {
  const [uploading, setUploading] = useState(false)

  const handleNombre = (e) => {
    onChange({ ...coach, nombre: capitalizeWords(e.target.value) })
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `coaches/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('equipos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('equipos').getPublicUrl(path)
      onChange({ ...coach, foto: data.publicUrl })
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
        <Avatar src={coach.foto || undefined} sx={{ width: 72, height: 72, bgcolor: '#bdbdbd' }}>
          <PersonIcon />
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
            {uploading ? 'Subiendo...' : (coach.foto ? 'Cambiar foto' : 'Subir foto')}
            <input hidden type="file" accept="image/*" onChange={handleFile} />
          </Button>
          {coach.foto && (
            <IconButton
              size="small"
              color="error"
              onClick={() => onChange({ ...coach, foto: null })}
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

      <TextField
        fullWidth
        name="nombre"
        label="Nombre del coach"
        value={coach.nombre || ''}
        onChange={handleNombre}
        autoFocus
      />
    </Box>
  )
}
