'use client'

import { Box, Stack, TextField, MenuItem, Typography, Divider } from '@mui/material'

const categorias = {
  M: ['59', '66', '74', '83', '93', '105', '120', '+120'],
  F: ['47', '52', '57', '63', '69', '76', '84', '+84'],
}

const TANDAS = [
  { id: 1, nombre: 'Tanda 1' },
  { id: 2, nombre: 'Tanda 2' },
  { id: 3, nombre: 'Tanda 3' },
  { id: 4, nombre: 'Tanda 4' },
]

export function CreateAtletaForm({ atleta, onChange }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    onChange({ ...atleta, [name]: value })
  }

  const categoriasDisponibles = categorias[atleta.sexo] || []

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      {/* 🔹 Datos personales */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Datos personales
      </Typography>

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

      {/* 🔹 Fecha de nacimiento */}
      <TextField
        fullWidth
        name="fecha_nacimiento"
        label="Fecha de nacimiento"
        type="date"
        value={atleta.fecha_nacimiento || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />

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
          select
          fullWidth
          name="sexo"
          label="Sexo"
          value={atleta.sexo || ''}
          onChange={handleChange}
        >
          <MenuItem value="M">Masculino</MenuItem>
          <MenuItem value="F">Femenino</MenuItem>
        </TextField>
      </Stack>

      <TextField
        select
        fullWidth
        name="categoria"
        label="Categoría"
        value={atleta.categoria || ''}
        onChange={handleChange}
        sx={{ mb: 2 }}
        disabled={!atleta.sexo}
      >
        {categoriasDisponibles.map((cat) => (
          <MenuItem key={cat} value={cat}>
            {cat} kg
          </MenuItem>
        ))}
      </TextField>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Configuración de competencia
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          fullWidth
          name="tanda_id"
          label="Tanda"
          value={atleta.tanda_id || ''}
          onChange={handleChange}
        >
          {TANDAS.map((tanda) => (
            <MenuItem key={tanda.id} value={tanda.id}>
              {tanda.nombre}
            </MenuItem>
          ))}
        </TextField>

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
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Primeros intentos (kg)
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth
          type="number"
          name="primer_intento_sentadilla"
          label="Sentadilla (kg)"
          value={atleta.primer_intento_sentadilla || ''}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          type="number"
          name="primer_intento_banco"
          label="Press de banco (kg)"
          value={atleta.primer_intento_banco || ''}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          type="number"
          name="primer_intento_peso_muerto"
          label="Peso muerto (kg)"
          value={atleta.primer_intento_peso_muerto || ''}
          onChange={handleChange}
        />
      </Stack>
    </Box>
  )
}
