'use client'

import { Box, Stack, TextField, MenuItem } from '@mui/material'

export function EditAtletaForm({ atleta, onChange }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    onChange({ ...atleta, [name]: value })
  }

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      <TextField
        fullWidth
        name="nombre"
        label="Nombre"
        value={atleta.nombre || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          name="apellido"
          label="Apellido"
          value={atleta.apellido || ''}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name="dni"
          label="DNI"
          value={atleta.dni || ''}
          onChange={handleChange}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          name="peso_corporal"
          label="Peso corporal (kg)"
          type="number"
          value={atleta.peso_corporal || ''}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name="categoria"
          label="Categoría"
          value={atleta.categoria || ''}
          onChange={handleChange}
        />
      </Stack>

      <TextField
        select
        fullWidth
        name="modalidad"
        label="Modalidad"
        value={atleta.modalidad || ''}
        onChange={handleChange}
      >
        <MenuItem value="Classic Raw">Classic Raw</MenuItem>
        <MenuItem value="Equipado">Equipado</MenuItem>
      </TextField>
    </Box>
  )
}
