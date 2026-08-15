'use client'

import { useState } from 'react'
import {
  Box, Stack, TextField, MenuItem, Typography, Checkbox, FormControlLabel,
  Radio, RadioGroup,
} from '@mui/material'
import { UsersThree as GroupsIcon } from '@phosphor-icons/react'
import { capitalizeWords } from '../../utils/textUtils'
import { supabase } from '../../lib/supabaseClient'
import { ModalSection } from './ModalLayout'
import { PhotoUploadField } from './PhotoUploadField'

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
    <Box component="form" sx={{ width: '100%', display: 'grid' }}>
      <ModalSection title="Identidad del equipo" description="Nombre, imagen y color identificador.">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '300px minmax(0, 1fr)' }, gap: 2, alignItems: 'center' }}>
      <PhotoUploadField
        src={equipo.foto}
        uploading={uploading}
        onFile={handleFile}
        fallbackIcon={<GroupsIcon size={27} />}
        avatarSx={{ bgcolor: equipo.color || '#bdbdbd' }}
      />

      <TextField
        fullWidth
        size="small"
        required
        helperText={!equipo.nombre?.trim() ? 'Campo obligatorio' : ''}
        slotProps={{
          formHelperText: {
            sx: { color: !equipo.nombre?.trim() ? 'error.main' : 'text.secondary' },
          },
        }}
        name="nombre"
        label="Nombre del equipo"
        value={equipo.nombre || ''}
        onChange={handleChange}
      />
      </Box>

      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
        Color
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
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
      </ModalSection>

      <ModalSection title="Responsables" description="Coaches asignados al equipo. Marcá cuál es el principal (se muestra en la presentación del atleta).">
      {coaches.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No hay coaches cargados todavía</Typography>
      ) : (
        <RadioGroup
          value={equipo.coach_principal_id ? String(equipo.coach_principal_id) : ''}
          onChange={(e) => onChange({ ...equipo, coach_principal_id: Number(e.target.value) })}
        >
          <Stack spacing={0.5}>
            {coaches.map((c) => {
              const coachIds = equipo.coach_ids || []
              const checked = coachIds.includes(c.id)
              const toggle = () => {
                const nextIds = checked ? coachIds.filter((id) => id !== c.id) : [...coachIds, c.id]
                let nextPrincipal = equipo.coach_principal_id
                if (checked && c.id === nextPrincipal) {
                  nextPrincipal = nextIds[0] || null
                } else if (!checked && !nextPrincipal) {
                  nextPrincipal = c.id
                }
                onChange({ ...equipo, coach_ids: nextIds, coach_principal_id: nextPrincipal })
              }
              return (
                <Stack key={c.id} direction="row" alignItems="center" spacing={1}>
                  <FormControlLabel
                    sx={{ flex: 1, mr: 0 }}
                    control={<Checkbox checked={checked} onChange={toggle} />}
                    label={capitalizeWords(c.nombre)}
                  />
                  <FormControlLabel
                    value={String(c.id)}
                    disabled={!checked}
                    control={<Radio size="small" />}
                    label="Principal"
                  />
                </Stack>
              )
            })}
          </Stack>
        </RadioGroup>
      )}
      </ModalSection>
    </Box>
  )
}
