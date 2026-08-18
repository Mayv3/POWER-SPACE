'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, FormControl, Select, MenuItem,
  TextField, InputAdornment, Stack, CircularProgress,
  Paper, Chip,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { columnsIntentos } from '../../../const/columns/columnsIntentos'
import { ValidoIntentoModal } from '../../../components/modales/ValidoIntentoModal'
import { Calculate_IPF_GL } from '../../../utils/calcularIPF'
import { useDarkMode } from '../../../context/ThemeContext'
import { apiFetch } from '../../../lib/api'
import { clavesCategoriasAtleta } from '../../../const/categorias/categorias'
import { TANDA_IDS, letraTanda } from '../../../const/tandas'
import { colorCategoria } from '../../../utils/colorCategoria'

const COLORES_PRIMARIOS_CATEGORIAS = [
  '#1565c0', // azul
  '#B99F00', // amarillo oscuro
  '#2e7d32', // verde
  '#6a1b9a', // violeta
  '#e65100', // naranja
  '#ad1457', // fucsia
]

function calcularPuestos(atletas) {
  const grupos = {}

  atletas.forEach(atleta => {
    clavesCategoriasAtleta(atleta).forEach((key) => {
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(atleta)
    })
  })

  const mejorPuestoPorId = new Map()

  Object.keys(grupos).forEach(grupoKey => {
    const atletasDelGrupo = grupos[grupoKey]

    const conGl = atletasDelGrupo
      .filter(a => a.ipf_gl && a.ipf_gl > 0)
      .sort((a, b) => b.ipf_gl - a.ipf_gl)

    conGl.forEach((atleta, index) => {
      const puesto = index + 1
      mejorPuestoPorId.set(atleta.id, Math.min(mejorPuestoPorId.get(atleta.id) ?? Infinity, puesto))
    })
  })

  return atletas.map((atleta) => ({
    ...atleta,
    puesto: mejorPuestoPorId.get(atleta.id) ?? null,
  }))
}


export default function IntentosPage() {
  const [atletas, setAtletas] = useState([])
  const [atletasFiltrados, setAtletasFiltrados] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [tandaSeleccionada, setTandaSeleccionada] = useState('todas')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas')

  const coloresPorCategoria = useMemo(() => {
    if (tandaSeleccionada === 'todas') return new Map()

    const categoriasDeTanda = [...new Set(
      atletas
        .filter(a => a.tanda_id === parseInt(tandaSeleccionada, 10))
        .map(a => a.categoria)
        .filter(Boolean)
    )].sort()

    return new Map(categoriasDeTanda.map((categoria, index) => [
      categoria,
      COLORES_PRIMARIOS_CATEGORIAS[index % COLORES_PRIMARIOS_CATEGORIAS.length],
    ]))
  }, [atletas, tandaSeleccionada])

  const colorCategoriaVisible = (categoria) => tandaSeleccionada === 'todas'
    ? colorCategoria(categoria)
    : coloresPorCategoria.get(categoria) || COLORES_PRIMARIOS_CATEGORIAS[0]

  const [openValidoModal, setOpenValidoModal] = useState(false)
  const [selectedIntento, setSelectedIntento] = useState(null)

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(
        `/api/intentos/atletas-con-intentos?tanda_id=todas`
      )
      const data = await res.json()

      const atletasConDots = data.map(atleta => {
        const sentadillaValidos = [
          atleta.valido_s1 === true ? atleta.primer_intento_sentadilla : 0,
          atleta.valido_s2 === true ? atleta.segundo_intento_sentadilla : 0,
          atleta.valido_s3 === true ? atleta.tercer_intento_sentadilla : 0
        ]
        const sentadilla = Math.max(...sentadillaValidos)

        const bancoValidos = [
          atleta.valido_b1 === true ? atleta.primer_intento_banco : 0,
          atleta.valido_b2 === true ? atleta.segundo_intento_banco : 0,
          atleta.valido_b3 === true ? atleta.tercer_intento_banco : 0
        ]
        const banco = Math.max(...bancoValidos)

        const pesoMuertoValidos = [
          atleta.valido_d1 === true ? atleta.primer_intento_peso_muerto : 0,
          atleta.valido_d2 === true ? atleta.segundo_intento_peso_muerto : 0,
          atleta.valido_d3 === true ? atleta.tercer_intento_peso_muerto : 0
        ]
        const pesoMuerto = Math.max(...pesoMuertoValidos)

        const total = sentadilla + banco + pesoMuerto

        const tieneSentadillaValida = atleta.valido_s1 === true || atleta.valido_s2 === true || atleta.valido_s3 === true
        const tieneBancoValido = atleta.valido_b1 === true || atleta.valido_b2 === true || atleta.valido_b3 === true
        const tienePesoMuertoValido = atleta.valido_d1 === true || atleta.valido_d2 === true || atleta.valido_d3 === true
        const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

        let ipf_gl = null
        if (tieneTodasLasValidaciones && total > 0 && atleta.peso_corporal > 0) {
          const isFemale = atleta.sexo === 'F'
          const equipado = String(atleta.modalidad || '').toLowerCase().includes('equip')
          ipf_gl = parseFloat(Calculate_IPF_GL(atleta.peso_corporal, total, isFemale, equipado).toFixed(2))
        }

        return { ...atleta, total: total > 0 ? total : null, ipf_gl }
      })

      const atletasConPuestos = calcularPuestos(atletasConDots)
      setAtletas(atletasConPuestos)
      setAtletasFiltrados(atletasConPuestos)
    } catch (err) {
      console.error('Error al cargar atletas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAtletas() }, [])

  useEffect(() => {
    let filtrados = atletas

    if (tandaSeleccionada !== 'todas') {
      filtrados = filtrados.filter(a => a.tanda_id === parseInt(tandaSeleccionada))
    }
    if (categoriaSeleccionada !== 'todas') {
      filtrados = filtrados.filter(a => String(a.categoria) === String(categoriaSeleccionada))
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase()
      filtrados = filtrados.filter(a =>
        a.nombre?.toLowerCase().includes(q) ||
        a.apellido?.toLowerCase().includes(q)
      )
    }

    setAtletasFiltrados(filtrados)
  }, [tandaSeleccionada, categoriaSeleccionada, searchTerm, atletas])

  const processRowUpdate = async (newRow, oldRow) => {
    try {
      const intentosParaActualizar = []

      const mapearCampoAIntento = {
        primer_intento_sentadilla: { movimiento_id: 1, intento_numero: 1 },
        segundo_intento_sentadilla: { movimiento_id: 1, intento_numero: 2 },
        tercer_intento_sentadilla: { movimiento_id: 1, intento_numero: 3 },
        primer_intento_banco: { movimiento_id: 2, intento_numero: 1 },
        segundo_intento_banco: { movimiento_id: 2, intento_numero: 2 },
        tercer_intento_banco: { movimiento_id: 2, intento_numero: 3 },
        primer_intento_peso_muerto: { movimiento_id: 3, intento_numero: 1 },
        segundo_intento_peso_muerto: { movimiento_id: 3, intento_numero: 2 },
        tercer_intento_peso_muerto: { movimiento_id: 3, intento_numero: 3 },
      }

      for (const [campo, config] of Object.entries(mapearCampoAIntento)) {
        if (newRow[campo] !== oldRow[campo] && newRow[campo] != null && newRow[campo] !== '') {
          intentosParaActualizar.push({
            atleta_id: newRow.id,
            movimiento_id: config.movimiento_id,
            intento_numero: config.intento_numero,
            peso: parseFloat(newRow[campo]),
            valido: null,
          })
        }
      }

      for (const intento of intentosParaActualizar) {
        const res = await apiFetch(`/api/intentos/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(intento),
        })
        if (!res.ok) throw new Error('Error al actualizar intento')
      }

      // newRow viene de la vista atletas_con_intentos (segundo_intento_*, ipf_gl,
      // etc. no existen como columnas reales en atletas) -> whitelist explícita.
      if (newRow.altura_rack_sentadilla !== oldRow.altura_rack_sentadilla || newRow.altura_rack_banco !== oldRow.altura_rack_banco) {
        const {
          nombre, apellido, dni, fecha_nacimiento, categoria, categoria_edad,
          peso_corporal, modalidad, tanda_id, primer_intento_sentadilla,
          primer_intento_banco, primer_intento_peso_muerto, sexo,
          altura_rack_sentadilla, altura_rack_banco, equipo_id, foto,
        } = newRow
        const res = await apiFetch(`/api/atletas/${newRow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre, apellido, dni, fecha_nacimiento, categoria, categoria_edad,
            peso_corporal, modalidad, tanda_id, primer_intento_sentadilla,
            primer_intento_banco, primer_intento_peso_muerto, sexo,
            altura_rack_sentadilla, altura_rack_banco, equipo_id, foto,
          }),
        })
        if (!res.ok) throw new Error('Error al actualizar altura de rack')
      }

      const sentadilla = Math.max(
        newRow.valido_s1 === true ? (newRow.primer_intento_sentadilla || 0) : 0,
        newRow.valido_s2 === true ? (newRow.segundo_intento_sentadilla || 0) : 0,
        newRow.valido_s3 === true ? (newRow.tercer_intento_sentadilla || 0) : 0
      )
      const banco = Math.max(
        newRow.valido_b1 === true ? (newRow.primer_intento_banco || 0) : 0,
        newRow.valido_b2 === true ? (newRow.segundo_intento_banco || 0) : 0,
        newRow.valido_b3 === true ? (newRow.tercer_intento_banco || 0) : 0
      )
      const pesoMuerto = Math.max(
        newRow.valido_d1 === true ? (newRow.primer_intento_peso_muerto || 0) : 0,
        newRow.valido_d2 === true ? (newRow.segundo_intento_peso_muerto || 0) : 0,
        newRow.valido_d3 === true ? (newRow.tercer_intento_peso_muerto || 0) : 0
      )
      const total = sentadilla + banco + pesoMuerto

      const tieneSentadillaValida = newRow.valido_s1 === true || newRow.valido_s2 === true || newRow.valido_s3 === true
      const tieneBancoValido = newRow.valido_b1 === true || newRow.valido_b2 === true || newRow.valido_b3 === true
      const tienePesoMuertoValido = newRow.valido_d1 === true || newRow.valido_d2 === true || newRow.valido_d3 === true
      const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

      let ipf_gl = null
      if (tieneTodasLasValidaciones && total > 0 && newRow.peso_corporal > 0) {
        const isFemale = newRow.sexo === 'F'
        const equipado = String(newRow.modalidad || '').toLowerCase().includes('equip')
        ipf_gl = parseFloat(Calculate_IPF_GL(newRow.peso_corporal, total, isFemale, equipado).toFixed(2))
      }

      const rowConDots = { ...newRow, total: total > 0 ? total : null, ipf_gl }
      const atletasActualizados = atletas.map(a => a.id === newRow.id ? rowConDots : a)
      const atletasConPuestos = calcularPuestos(atletasActualizados)
      setAtletas(atletasConPuestos)

      return atletasConPuestos.find(a => a.id === newRow.id) || rowConDots
    } catch (err) {
      console.error('Error al actualizar atleta:', err)
      return oldRow
    }
  }

  const handleProcessRowUpdateError = (error) => {
    console.error('Error al procesar actualización:', error)
  }

  const handleCellClick = (row, field) => {
    const mapeoIntentos = {
      primer_intento_sentadilla: { ejercicio: 'sentadilla', intento: 1, movimiento_id: 1 },
      segundo_intento_sentadilla: { ejercicio: 'sentadilla', intento: 2, movimiento_id: 1 },
      tercer_intento_sentadilla: { ejercicio: 'sentadilla', intento: 3, movimiento_id: 1 },
      primer_intento_banco: { ejercicio: 'banco', intento: 1, movimiento_id: 2 },
      segundo_intento_banco: { ejercicio: 'banco', intento: 2, movimiento_id: 2 },
      tercer_intento_banco: { ejercicio: 'banco', intento: 3, movimiento_id: 2 },
      primer_intento_peso_muerto: { ejercicio: 'peso_muerto', intento: 1, movimiento_id: 3 },
      segundo_intento_peso_muerto: { ejercicio: 'peso_muerto', intento: 2, movimiento_id: 3 },
      tercer_intento_peso_muerto: { ejercicio: 'peso_muerto', intento: 3, movimiento_id: 3 },
    }

    const intentoInfo = mapeoIntentos[field]
    if (!intentoInfo) return

    setSelectedIntento({ atleta: row, field, ...intentoInfo })
    setOpenValidoModal(true)
  }

  const handleConfirmValido = async (valido, nuevoPeso) => {
    if (!selectedIntento) return

    try {
      const bodyData = {
        atleta_id: selectedIntento.atleta.id,
        movimiento_id: selectedIntento.movimiento_id,
        intento_numero: selectedIntento.intento,
        valido,
      }
      if (nuevoPeso !== null && nuevoPeso !== undefined) {
        bodyData.peso = nuevoPeso
      }

      const res = await apiFetch(`/api/intentos/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })
      if (!res.ok) throw new Error('Error al actualizar válido')

      const validoFieldMap = {
        'primer_intento_sentadilla': 'valido_s1',
        'segundo_intento_sentadilla': 'valido_s2',
        'tercer_intento_sentadilla': 'valido_s3',
        'primer_intento_banco': 'valido_b1',
        'segundo_intento_banco': 'valido_b2',
        'tercer_intento_banco': 'valido_b3',
        'primer_intento_peso_muerto': 'valido_d1',
        'segundo_intento_peso_muerto': 'valido_d2',
        'tercer_intento_peso_muerto': 'valido_d3',
      }

      const validoField = validoFieldMap[selectedIntento.field]
      const atletaActualizado = {
        ...selectedIntento.atleta,
        [validoField]: valido,
        ...(nuevoPeso !== null && nuevoPeso !== undefined ? { [selectedIntento.field]: nuevoPeso } : {}),
      }

      const sentadilla = Math.max(
        atletaActualizado.valido_s1 === true ? (atletaActualizado.primer_intento_sentadilla || 0) : 0,
        atletaActualizado.valido_s2 === true ? (atletaActualizado.segundo_intento_sentadilla || 0) : 0,
        atletaActualizado.valido_s3 === true ? (atletaActualizado.tercer_intento_sentadilla || 0) : 0
      )
      const banco = Math.max(
        atletaActualizado.valido_b1 === true ? (atletaActualizado.primer_intento_banco || 0) : 0,
        atletaActualizado.valido_b2 === true ? (atletaActualizado.segundo_intento_banco || 0) : 0,
        atletaActualizado.valido_b3 === true ? (atletaActualizado.tercer_intento_banco || 0) : 0
      )
      const pesoMuerto = Math.max(
        atletaActualizado.valido_d1 === true ? (atletaActualizado.primer_intento_peso_muerto || 0) : 0,
        atletaActualizado.valido_d2 === true ? (atletaActualizado.segundo_intento_peso_muerto || 0) : 0,
        atletaActualizado.valido_d3 === true ? (atletaActualizado.tercer_intento_peso_muerto || 0) : 0
      )
      const total = sentadilla + banco + pesoMuerto

      const tieneSentadillaValida = atletaActualizado.valido_s1 === true || atletaActualizado.valido_s2 === true || atletaActualizado.valido_s3 === true
      const tieneBancoValido = atletaActualizado.valido_b1 === true || atletaActualizado.valido_b2 === true || atletaActualizado.valido_b3 === true
      const tienePesoMuertoValido = atletaActualizado.valido_d1 === true || atletaActualizado.valido_d2 === true || atletaActualizado.valido_d3 === true
      const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

      let ipf_gl = null
      if (tieneTodasLasValidaciones && total > 0 && atletaActualizado.peso_corporal > 0) {
        const isFemale = atletaActualizado.sexo === 'F'
        const equipado = String(atletaActualizado.modalidad || '').toLowerCase().includes('equip')
        ipf_gl = parseFloat(Calculate_IPF_GL(atletaActualizado.peso_corporal, total, isFemale, equipado).toFixed(2))
      }

      const rowConDots = { ...atletaActualizado, total: total > 0 ? total : null, ipf_gl }
      const atletasActualizados = atletas.map(a => a.id === selectedIntento.atleta.id ? rowConDots : a)
      const atletasConPuestos = calcularPuestos(atletasActualizados)
      setAtletas(atletasConPuestos)

      setOpenValidoModal(false)
      setSelectedIntento(null)
    } catch (err) {
      console.error('Error al actualizar válido:', err)
    }
  }

  const categoriasDisponibles = [...new Set(atletas.map(a => a.categoria))].sort()

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 },
        '@media (orientation: landscape) and (max-height: 599.95px)': { p: 0, gap: 0 },
      }}
    >

      {/* Buscador + Tabla */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'visible',
          backgroundColor: 'transparent',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(240px, 1fr) 170px 210px' },
            minHeight: { xs: 108, md: 70 },
            bgcolor: isDark ? '#111d18' : '#f5faf7',
            border: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
            borderBottom: 0,
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              minWidth: 0, px: 1.5, py: 1,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              gridColumn: { xs: '1 / -1', md: 'auto' },
              borderBottom: { xs: `1px solid ${isDark ? '#244238' : '#d6e7df'}`, md: 0 },
            }}
          >
            <TextField
              fullWidth
              variant="standard"
              placeholder="Nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#8aa9a0' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.9rem', fontWeight: 700 },
              }}
            />
          </Box>

          {[
            {
              label: 'Tanda',
              value: tandaSeleccionada,
              onChange: (e) => setTandaSeleccionada(e.target.value),
              options: [['todas', 'Todas las tandas'], ...TANDA_IDS.map((id) => [String(id), `Tanda ${letraTanda(id)}`])],
            },
            {
              label: 'Categoría',
              value: categoriaSeleccionada,
              onChange: (e) => setCategoriaSeleccionada(e.target.value),
              options: [['todas', 'Todas las categorías'], ...categoriasDisponibles.map((cat) => [cat, cat])],
            },
          ].map((filtro) => (
            <Box
              key={filtro.label}
              sx={{
                minWidth: 0, px: 1.25, pt: 0.85, pb: 0.55, textAlign: 'center',
                borderLeft: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, letterSpacing: 1.05, textTransform: 'uppercase', color: '#8aa9a0' }}>
                {filtro.label}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={filtro.value}
                onChange={filtro.onChange}
                inputProps={{ 'aria-label': filtro.label }}
                sx={{
                  mt: 0.25, height: 32, borderRadius: 0, fontSize: '0.86rem', fontWeight: 800,
                  '& .MuiOutlinedInput-notchedOutline': { border: 0 },
                  '&:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
                  '& .MuiSelect-select': { py: 0.5, pl: 1, pr: '26px !important', textAlign: 'center' },
                  '& .MuiSelect-icon': { right: 2, color: '#8aa9a0' },
                }}
              >
                {filtro.options.map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            flex: 1, minHeight: 0,
            border: `1px solid ${border}`,
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
            backgroundColor: surface,
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress size={40} sx={{ color: '#FF9800' }} />
            </Box>
          ) : (
            <GenericDataGrid
              rows={atletasFiltrados}
              columns={columnsIntentos(handleCellClick, colorCategoriaVisible)}
              paginationMode="client"
              processRowUpdate={processRowUpdate}
              onProcessRowUpdateError={handleProcessRowUpdateError}
              mobileHorizontal
            />
          )}
        </Box>
      </Paper>

      <ValidoIntentoModal
        open={openValidoModal}
        onClose={() => { setOpenValidoModal(false); setSelectedIntento(null) }}
        onConfirm={handleConfirmValido}
        atleta={selectedIntento?.atleta}
        ejercicio={selectedIntento?.ejercicio}
        intento={selectedIntento?.intento}
        pesoActual={selectedIntento?.atleta?.[selectedIntento?.field]}
        field={selectedIntento?.field}
      />
    </Box>
  )
}
