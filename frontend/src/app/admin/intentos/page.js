'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, Stack, CircularProgress } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { GenericDataGrid } from '../../../components/GenericDataGrid'
import { columnsIntentos } from '../../../const/columns/columnsIntentos'
import { ValidoIntentoModal } from '../../../components/modales/ValidoIntentoModal'
import { Calculate_DOTS } from '../../../utils/calcularDots'

function calcularPuestos(atletas) {
  // Agrupar solo por categoría (sin tanda)
  const grupos = {}

  atletas.forEach(atleta => {
    const key = atleta.categoria
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(atleta)
  })

  const atletasConPuesto = []

  Object.keys(grupos).forEach(grupoKey => {
    const atletasDelGrupo = grupos[grupoKey]

    // Ordenar solo los que tienen DOTS válidos
    const conDots = atletasDelGrupo
      .filter(a => a.dots && a.dots > 0)
      .sort((a, b) => b.dots - a.dots)

    conDots.forEach((atleta, index) => {
      atletasConPuesto.push({
        ...atleta,
        puesto: index + 1
      })
    })

    // Los que no tienen DOTS válidos quedan sin puesto
    atletasDelGrupo
      .filter(a => !a.dots || a.dots <= 0)
      .forEach(atleta => {
        atletasConPuesto.push({
          ...atleta,
          puesto: null
        })
      })
  })

  return atletasConPuesto
}


export default function IntentosPage() {
  const [atletas, setAtletas] = useState([])
  const [atletasFiltrados, setAtletasFiltrados] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [tandaSeleccionada, setTandaSeleccionada] = useState('todas')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas')

  const [openValidoModal, setOpenValidoModal] = useState(false)
  const [selectedIntento, setSelectedIntento] = useState(null)

  const fetchAtletas = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/intentos/atletas-con-intentos?tanda_id=todas`
      )
      const data = await res.json()

      const atletasConDots = data.map(atleta => {
        // Calcular mejores levantamientos usando solo intentos VÁLIDOS (true)
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

        // Calcular DOTS solo si tiene al menos un intento válido en cada ejercicio
        const tieneSentadillaValida = atleta.valido_s1 === true || atleta.valido_s2 === true || atleta.valido_s3 === true
        const tieneBancoValido = atleta.valido_b1 === true || atleta.valido_b2 === true || atleta.valido_b3 === true
        const tienePesoMuertoValido = atleta.valido_d1 === true || atleta.valido_d2 === true || atleta.valido_d3 === true
        const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

        let dots = null
        if (tieneTodasLasValidaciones && total > 0 && atleta.peso_corporal > 0) {
          const isFemale = atleta.sexo === 'F'
          dots = parseFloat(Calculate_DOTS(atleta.peso_corporal, total, isFemale))
        }

        return {
          ...atleta,
          total: total > 0 ? total : null,
          dots
        }
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

  useEffect(() => {
    fetchAtletas()
  }, [])

  useEffect(() => {
    let filtrados = atletas

    // Filtrar por tanda
    if (tandaSeleccionada !== 'todas') {
      filtrados = filtrados.filter(atleta => atleta.tanda_id === parseInt(tandaSeleccionada))
    }

    if (categoriaSeleccionada !== 'todas') {
      filtrados = filtrados.filter(atleta => String(atleta.categoria) === String(categoriaSeleccionada))
    }

    // Filtrar por búsqueda
    if (searchTerm.trim() !== '') {
      filtrados = filtrados.filter(atleta =>
        atleta.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        atleta.apellido?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setAtletasFiltrados(filtrados)
  }, [tandaSeleccionada, categoriaSeleccionada, searchTerm, atletas])


  const handleTandaChange = (event) => {
    setTandaSeleccionada(event.target.value)
  }

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
            valido: null // Establecer como null cuando se modifica el peso
          })
        }
      }

      for (const intento of intentosParaActualizar) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(intento),
        })

        if (!res.ok) throw new Error('Error al actualizar intento')
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

      // Verificar si cada ejercicio tiene al menos un intento válido
      const tieneSentadillaValida = newRow.valido_s1 === true || newRow.valido_s2 === true || newRow.valido_s3 === true
      const tieneBancoValido = newRow.valido_b1 === true || newRow.valido_b2 === true || newRow.valido_b3 === true
      const tienePesoMuertoValido = newRow.valido_d1 === true || newRow.valido_d2 === true || newRow.valido_d3 === true

      const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

      // Calcular DOTS solo si tiene al menos un intento válido en cada ejercicio
      let dots = null
      if (tieneTodasLasValidaciones && total > 0 && newRow.peso_corporal > 0) {
        const isFemale = newRow.sexo === 'F'
        dots = parseFloat(Calculate_DOTS(newRow.peso_corporal, total, isFemale))
      }

      const rowConDots = {
        ...newRow,
        total: total > 0 ? total : null,
        dots
      }

      const atletasActualizados = atletas.map(atleta =>
        atleta.id === newRow.id ? rowConDots : atleta
      )

      const atletasConPuestos = calcularPuestos(atletasActualizados)
      setAtletas(atletasConPuestos)

      const atletaActualizado = atletasConPuestos.find(a => a.id === newRow.id)
      return atletaActualizado || rowConDots
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

    setSelectedIntento({
      atleta: row,
      field,
      ...intentoInfo
    })
    setOpenValidoModal(true)
  }

  const handleConfirmValido = async (valido, nuevoPeso) => {
    if (!selectedIntento) return

    try {
      // Si valido es null, significa que se quiere restablecer (volver a null)
      const bodyData = {
        atleta_id: selectedIntento.atleta.id,
        movimiento_id: selectedIntento.movimiento_id,
        intento_numero: selectedIntento.intento,
        valido: valido
      }

      // Solo incluir peso si no es null
      if (nuevoPeso !== null && nuevoPeso !== undefined) {
        bodyData.peso = nuevoPeso
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intentos/upsert`, {
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
        ...(nuevoPeso !== null && nuevoPeso !== undefined ? { [selectedIntento.field]: nuevoPeso } : {})
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

      // Verificar si cada ejercicio tiene al menos un intento válido
      const tieneSentadillaValida = atletaActualizado.valido_s1 === true || atletaActualizado.valido_s2 === true || atletaActualizado.valido_s3 === true
      const tieneBancoValido = atletaActualizado.valido_b1 === true || atletaActualizado.valido_b2 === true || atletaActualizado.valido_b3 === true
      const tienePesoMuertoValido = atletaActualizado.valido_d1 === true || atletaActualizado.valido_d2 === true || atletaActualizado.valido_d3 === true

      const tieneTodasLasValidaciones = tieneSentadillaValida && tieneBancoValido && tienePesoMuertoValido

      // Calcular DOTS solo si tiene al menos un intento válido en cada ejercicio
      let dots = null
      if (tieneTodasLasValidaciones && total > 0 && atletaActualizado.peso_corporal > 0) {
        const isFemale = atletaActualizado.sexo === 'F'
        dots = parseFloat(Calculate_DOTS(atletaActualizado.peso_corporal, total, isFemale))
      }

      const rowConDots = {
        ...atletaActualizado,
        total: total > 0 ? total : null,
        dots
      }

      const atletasActualizados = atletas.map(atleta =>
        atleta.id === selectedIntento.atleta.id ? rowConDots : atleta
      )

      const atletasConPuestos = calcularPuestos(atletasActualizados)
      setAtletas(atletasConPuestos)

      setOpenValidoModal(false)
      setSelectedIntento(null)
    } catch (err) {
      console.error('Error al actualizar válido:', err)
    }
  }

  return (
    <Box sx={{ padding: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Intentos
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
            {tandaSeleccionada === 'todas'
              ? 'Todas las tandas'
              : `Tanda ${tandaSeleccionada}`
            }
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="tanda-select-label">Tanda</InputLabel>
            <Select
              labelId="tanda-select-label"
              id="tanda-select"
              value={tandaSeleccionada}
              label="Tanda"
              onChange={handleTandaChange}
            >
              <MenuItem value="todas">Todas las tandas</MenuItem>
              <MenuItem value="1">Tanda 1</MenuItem>
              <MenuItem value="2">Tanda 2</MenuItem>
              <MenuItem value="3">Tanda 3</MenuItem>
              <MenuItem value="4">Tanda 4</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="categoria-select-label">Categoría</InputLabel>
            <Select
              labelId="categoria-select-label"
              id="categoria-select"
              value={categoriaSeleccionada}
              label="Categoría"
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            >
              <MenuItem value="todas">Todas las categorías</MenuItem>
              {[...new Set(atletas.map(a => a.categoria))]
                .sort((a, b) => a - b)
                .map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </Stack>

      </Box>

      {/* Buscador */}
      <TextField
        fullWidth
        placeholder="Buscar por nombre o apellido..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 300,
          }}
        >
          <CircularProgress size={50} sx={{ color: '#FF9800' }} />
        </Box>
      ) : (
        <GenericDataGrid
          rows={atletasFiltrados}
          columns={columnsIntentos(handleCellClick)}
          paginationMode="client"
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
        />
      )}


      <ValidoIntentoModal
        open={openValidoModal}
        onClose={() => {
          setOpenValidoModal(false)
          setSelectedIntento(null)
        }}
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
