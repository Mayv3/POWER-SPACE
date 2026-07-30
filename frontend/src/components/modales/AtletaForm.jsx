'use client'

import { useState } from 'react'
import {
  Box,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { User as PersonIcon } from '@phosphor-icons/react'
import { capitalizeWords } from '../../utils/textUtils'
import {
  calcularEdad,
  categoriasEdadDisponibles,
  categoriasPesoDisponibles,
  normalizarCategoriasEdad,
} from '../../const/categorias/categorias'
import { supabase } from '../../lib/supabaseClient'
import { optimizeImage } from '../../utils/optimizeImage'
import { ModalSection } from './ModalLayout'
import { PhotoUploadField } from './PhotoUploadField'

const TANDAS = [1, 2, 3, 4]
const ALTURAS_RACK = Array.from({ length: 20 }, (_, index) => index + 1)

const fieldsGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
  alignItems: 'start',
}

const compactFieldSx = {
  '& .MuiInputBase-root': {
    minHeight: 48,
  },
}

const isMissing = (value) => (
  Array.isArray(value)
    ? value.length === 0
    : value === null || value === undefined || String(value).trim() === ''
)

export const isAtletaFormValid = (atleta = {}) => [
  atleta.nombre,
  atleta.apellido,
  atleta.dni,
  atleta.fecha_nacimiento,
  atleta.sexo,
  atleta.peso_corporal,
  atleta.categoria_edad,
  atleta.categoria,
  atleta.modalidad,
  atleta.tanda_id,
].every((value) => !isMissing(value))

export function AtletaForm({ atleta, onChange, equipos = [] }) {
  const [uploading, setUploading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    let nextAtleta = {
      ...atleta,
      [name]: name === 'nombre' || name === 'apellido' ? capitalizeWords(value) : value,
    }

    if (name === 'fecha_nacimiento') {
      nextAtleta.edad = calcularEdad(value) ?? ''
      const opcionesEdad = categoriasEdadDisponibles(value)
      const seleccionValida = normalizarCategoriasEdad(nextAtleta.categoria_edad)
        .filter((edad) => opcionesEdad.includes(edad))
      nextAtleta.categoria_edad = seleccionValida.length
        ? seleccionValida
        : (opcionesEdad[0] ? [opcionesEdad[0]] : [])
    }

    if (['fecha_nacimiento', 'categoria_edad', 'sexo'].includes(name)) {
      const opcionesPeso = categoriasPesoDisponibles(nextAtleta.sexo, nextAtleta.categoria_edad)
      if (!opcionesPeso.includes(nextAtleta.categoria)) nextAtleta.categoria = ''
    }

    onChange(nextAtleta)
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const optimized = await optimizeImage(file)
      const extension = optimized.name.split('.').pop()
      const path = `atletas/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
      const { error } = await supabase.storage
        .from('atletas')
        .upload(path, optimized, { upsert: true, contentType: optimized.type })
      if (error) throw error
      const { data } = supabase.storage.from('atletas').getPublicUrl(path)
      onChange({ ...atleta, foto: data.publicUrl })
    } catch (error) {
      console.error('Error al subir foto:', error)
      alert('No se pudo subir la foto.')
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const fields = Array.from(event.target.form?.querySelectorAll('input, select, textarea') || [])
    const currentIndex = fields.indexOf(event.target)
    fields[currentIndex + 1]?.focus()
  }

  const categoriasEdad = categoriasEdadDisponibles(atleta.fecha_nacimiento)
  const categoriasEdadSeleccionadas = normalizarCategoriasEdad(atleta.categoria_edad)
  const categoriasPeso = categoriasPesoDisponibles(atleta.sexo, categoriasEdadSeleccionadas)
  const fieldProps = {
    fullWidth: true,
    size: 'small',
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    sx: compactFieldSx,
  }
  const requiredProps = (value, helperText = '') => {
    const missing = isMissing(value)
    return {
      required: true,
      helperText: missing ? 'Campo obligatorio' : helperText,
      slotProps: {
        formHelperText: {
          sx: { color: missing ? 'error.main' : 'text.secondary' },
        },
      },
    }
  }

  return (
    <Box
      component="form"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(300px, 0.8fr) minmax(0, 1.2fr)' },
        columnGap: { xs: 0, lg: 4 },
        rowGap: 0,
        width: '100%',
      }}
    >
      <ModalSection
        title="Datos del atleta"
        description="Identidad y datos personales."
        sx={{ gridColumn: '1 / -1' }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' },
            gap: 2.25,
            alignItems: 'stretch',
          }}
        >
          <PhotoUploadField
            src={atleta.foto}
            uploading={uploading}
            onFile={handleFile}
            fallbackIcon={<PersonIcon size={27} />}
          />

          <Box sx={fieldsGridSx}>
            <TextField
              {...fieldProps}
              name="nombre"
              label="Nombre"
              value={atleta.nombre || ''}
              {...requiredProps(atleta.nombre)}
            />
            <TextField
              {...fieldProps}
              name="apellido"
              label="Apellido"
              value={atleta.apellido || ''}
              {...requiredProps(atleta.apellido)}
            />
            <TextField
              {...fieldProps}
              name="dni"
              label="DNI"
              value={atleta.dni || ''}
              {...requiredProps(atleta.dni)}
            />
            <TextField
              {...fieldProps}
              name="fecha_nacimiento"
              label="Fecha de nacimiento"
              type="date"
              value={atleta.fecha_nacimiento?.slice?.(0, 10) || ''}
              InputLabelProps={{ shrink: true }}
              {...requiredProps(atleta.fecha_nacimiento)}
            />
            <TextField
              {...fieldProps}
              select
              name="sexo"
              label="Sexo"
              value={atleta.sexo || ''}
              {...requiredProps(atleta.sexo)}
            >
              <MenuItem value="M">Masculino</MenuItem>
              <MenuItem value="F">Femenino</MenuItem>
            </TextField>
            <TextField
              {...fieldProps}
              name="peso_corporal"
              label="Peso corporal"
              type="number"
              value={atleta.peso_corporal || ''}
              InputProps={{ endAdornment: <Typography color="text.secondary">kg</Typography> }}
              {...requiredProps(atleta.peso_corporal)}
            />
          </Box>
        </Box>
      </ModalSection>

      <ModalSection
        title="Competencia"
        description="Clasificación, división y ubicación dentro del torneo."
        sx={{ gridColumn: '1 / -1' }}
      >
        <Box sx={fieldsGridSx}>
          <TextField
            {...fieldProps}
            select
            name="categoria_edad"
            label="Categorías de edad"
            value={categoriasEdadSeleccionadas}
            disabled={!atleta.fecha_nacimiento || categoriasEdad.length === 0}
            SelectProps={{
              multiple: true,
              renderValue: (seleccionadas) => seleccionadas.join(' / '),
            }}
            helperText={
              isMissing(categoriasEdadSeleccionadas)
                ? 'Campo obligatorio'
                : (
                  atleta.fecha_nacimiento && categoriasEdad.length === 0
                    ? 'Disponible desde los 14 años'
                    : 'Puede seleccionar más de una'
                )
            }
            required
            slotProps={{
              formHelperText: {
                sx: {
                  color: isMissing(categoriasEdadSeleccionadas) ? 'error.main' : 'text.secondary',
                },
              },
            }}
          >
            {categoriasEdad.map((categoria) => (
              <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
            ))}
          </TextField>

          <TextField
            {...fieldProps}
            select
            name="categoria"
            label="Categoría de peso"
            value={atleta.categoria || ''}
            disabled={!atleta.sexo || categoriasEdadSeleccionadas.length === 0}
            {...requiredProps(atleta.categoria)}
          >
            {categoriasPeso.map((categoria) => (
              <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
            ))}
          </TextField>

          <TextField
            {...fieldProps}
            select
            name="modalidad"
            label="División"
            value={atleta.modalidad || ''}
            {...requiredProps(atleta.modalidad)}
          >
            <MenuItem value="Powerlifting">Powerlifting</MenuItem>
            <MenuItem value="Equipado">Equipado</MenuItem>
            <MenuItem value="Push Pull">Push Pull</MenuItem>
            <MenuItem value="Bench Press">Bench Press</MenuItem>
          </TextField>

          <TextField
            {...fieldProps}
            select
            name="tanda_id"
            label="Tanda"
            value={atleta.tanda_id || ''}
            {...requiredProps(atleta.tanda_id)}
          >
            {TANDAS.map((tanda) => (
              <MenuItem key={tanda} value={tanda}>Tanda {tanda}</MenuItem>
            ))}
          </TextField>

          <TextField
            {...fieldProps}
            select
            name="equipo_id"
            label="Equipo"
            value={atleta.equipo_id || ''}
            sx={{ ...compactFieldSx, gridColumn: { sm: 'span 2' } }}
          >
            <MenuItem value=""><em>Sin equipo</em></MenuItem>
            {equipos.map((equipo) => (
              <MenuItem key={equipo.id} value={equipo.id}>
                {capitalizeWords(equipo.nombre)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </ModalSection>

      <ModalSection title="Altura de rack" description="Posiciones para sentadilla y banco.">
        <Box sx={{ ...fieldsGridSx, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
          <TextField
            {...fieldProps}
            select
            name="altura_rack_sentadilla"
            label="Sentadilla"
            value={atleta.altura_rack_sentadilla || ''}
          >
            {ALTURAS_RACK.map((altura) => (
              <MenuItem key={altura} value={altura}>{altura}</MenuItem>
            ))}
          </TextField>
          <TextField
            {...fieldProps}
            select
            name="altura_rack_banco"
            label="Press de banco"
            value={atleta.altura_rack_banco || ''}
          >
            {ALTURAS_RACK.map((altura) => (
              <MenuItem key={altura} value={altura}>{altura}</MenuItem>
            ))}
          </TextField>
        </Box>
      </ModalSection>

      <ModalSection title="Primeros intentos" description="Pesos iniciales en kilogramos.">
        <Box sx={fieldsGridSx}>
          <TextField
            {...fieldProps}
            name="primer_intento_sentadilla"
            label="Sentadilla"
            type="number"
            value={atleta.primer_intento_sentadilla || ''}
            InputProps={{ endAdornment: <Typography color="text.secondary">kg</Typography> }}
          />
          <TextField
            {...fieldProps}
            name="primer_intento_banco"
            label="Banco"
            type="number"
            value={atleta.primer_intento_banco || ''}
            InputProps={{ endAdornment: <Typography color="text.secondary">kg</Typography> }}
          />
          <TextField
            {...fieldProps}
            name="primer_intento_peso_muerto"
            label="Peso muerto"
            type="number"
            value={atleta.primer_intento_peso_muerto || ''}
            InputProps={{ endAdornment: <Typography color="text.secondary">kg</Typography> }}
          />
        </Box>
      </ModalSection>
    </Box>
  )
}
