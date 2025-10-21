'use client'

import { Box, Stack, TextField, MenuItem, Typography, Divider } from '@mui/material'

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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
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
        
        <TextField
          select
          fullWidth
          name="tanda_id"
          label="Tanda"
          value={atleta.tanda_id || ''}
          onChange={handleChange}
        >
          <MenuItem value={1}>Tanda 1</MenuItem>
          <MenuItem value={2}>Tanda 2</MenuItem>
          <MenuItem value={3}>Tanda 3</MenuItem>
          <MenuItem value={4}>Tanda 4</MenuItem>
        </TextField>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Primeros Intentos
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          name="primer_intento_sentadilla"
          label="Sentadilla (S1)"
          type="number"
          value={atleta.primer_intento_sentadilla || ''}
          onChange={handleChange}
          placeholder="Peso en kg"
        />
        <TextField
          fullWidth
          name="primer_intento_banco"
          label="Banco (B1)"
          type="number"
          value={atleta.primer_intento_banco || ''}
          onChange={handleChange}
          placeholder="Peso en kg"
        />
        <TextField
          fullWidth
          name="primer_intento_peso_muerto"
          label="Peso Muerto (D1)"
          type="number"
          value={atleta.primer_intento_peso_muerto || ''}
          onChange={handleChange}
          placeholder="Peso en kg"
        />
      </Stack>
    </Box>
  )
}
