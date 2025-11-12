'use client'

import { Box, Stack, TextField, MenuItem, Typography, Divider } from '@mui/material'
import { capitalizeWords } from '../../utils/textUtils'
import categorias from '../../const/categorias/categorias'


const TANDAS = [
  { id: 1, nombre: 'Tanda 1' },
  { id: 2, nombre: 'Tanda 2' },
  { id: 3, nombre: 'Tanda 3' },
  { id: 4, nombre: 'Tanda 4' },
]

export function CreateAtletaForm({ atleta, onChange }) {
  const handleChange = (e) => {
    const { name, value } = e.target

    // Capitalizar nombre y apellido
    if (name === 'nombre' || name === 'apellido') {
      onChange({ ...atleta, [name]: capitalizeWords(value) })
    } else {
      onChange({ ...atleta, [name]: value })
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const form = e.target.form
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'))
      const index = inputs.indexOf(e.target)
      if (index < inputs.length - 1) {
        inputs[index + 1].focus()
      }
    }
  }

  const categoriasDisponibles = categorias[atleta.sexo] || []

  return (
    <Box component="form" sx={{ width: '100%', mt: 1 }}>
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
        onKeyDown={handleKeyDown}
        sx={{ mb: 2 }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          name="apellido"
          label="Apellido"
          value={atleta.apellido || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <TextField
          fullWidth
          name="dni"
          label="DNI"
          value={atleta.dni || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
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
        onKeyDown={handleKeyDown}
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
          onKeyDown={handleKeyDown}
        />

        <TextField
          select
          fullWidth
          name="sexo"
          label="Sexo"
          value={atleta.sexo || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
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
        onKeyDown={handleKeyDown}
        sx={{ mb: 2 }}
        disabled={!atleta.sexo}
      >
        {categoriasDisponibles.map((cat) => (
          <MenuItem key={cat} value={cat}>
            {cat}
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
          onKeyDown={handleKeyDown}
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
          onKeyDown={handleKeyDown}
        >
          <MenuItem value="Classic Raw">Classic Raw</MenuItem>
          <MenuItem value="Equipado">Equipado</MenuItem>
        </TextField>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Altura de rack
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          fullWidth
          name="altura_rack_sentadilla"
          label="Sentadilla"
          value={atleta.altura_rack_sentadilla || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
            <MenuItem key={num} value={num}>
              {num}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          name="altura_rack_banco"
          label="Press de banco"
          value={atleta.altura_rack_banco || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
            <MenuItem key={num} value={num}>
              {num}
            </MenuItem>
          ))}
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
          onKeyDown={handleKeyDown}
        />
        <TextField
          fullWidth
          type="number"
          name="primer_intento_banco"
          label="Press de banco (kg)"
          value={atleta.primer_intento_banco || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <TextField
          fullWidth
          type="number"
          name="primer_intento_peso_muerto"
          label="Peso muerto (kg)"
          value={atleta.primer_intento_peso_muerto || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </Stack>
    </Box>
  )
}
