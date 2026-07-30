'use client'

import { useState } from 'react'
import { Box, TextField } from '@mui/material'
import { User as PersonIcon } from '@phosphor-icons/react'
import { capitalizeWords } from '../../utils/textUtils'
import { supabase } from '../../lib/supabaseClient'
import { ModalSection } from './ModalLayout'
import { PhotoUploadField } from './PhotoUploadField'

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
    <Box component="form" sx={{ width: '100%' }}>
      <ModalSection title="Datos del coach" description="Nombre e imagen que se mostrarán en el sistema.">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '300px minmax(0, 1fr)' }, gap: 2, alignItems: 'center' }}>
      <PhotoUploadField
        src={coach.foto}
        uploading={uploading}
        onFile={handleFile}
        fallbackIcon={<PersonIcon size={27} />}
        avatarSx={{ bgcolor: '#bdbdbd' }}
      />

      <TextField
        fullWidth
        size="small"
        required
        helperText={!coach.nombre?.trim() ? 'Campo obligatorio' : ''}
        slotProps={{
          formHelperText: {
            sx: { color: !coach.nombre?.trim() ? 'error.main' : 'text.secondary' },
          },
        }}
        name="nombre"
        label="Nombre del coach"
        value={coach.nombre || ''}
        onChange={handleNombre}
        autoFocus
      />
      </Box>
      </ModalSection>
    </Box>
  )
}
