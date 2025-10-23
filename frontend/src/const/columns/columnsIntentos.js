import { Box, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

const getMejorIntento = (row, ejercicio) => {
  let intentos = []
  
  if (ejercicio === 'sentadilla') {
    intentos = [
      { peso: row.primer_intento_sentadilla, valido: row.valido_s1, field: 'primer_intento_sentadilla' },
      { peso: row.segundo_intento_sentadilla, valido: row.valido_s2, field: 'segundo_intento_sentadilla' },
      { peso: row.tercer_intento_sentadilla, valido: row.valido_s3, field: 'tercer_intento_sentadilla' }
    ]
  } else if (ejercicio === 'banco') {
    intentos = [
      { peso: row.primer_intento_banco, valido: row.valido_b1, field: 'primer_intento_banco' },
      { peso: row.segundo_intento_banco, valido: row.valido_b2, field: 'segundo_intento_banco' },
      { peso: row.tercer_intento_banco, valido: row.valido_b3, field: 'tercer_intento_banco' }
    ]
  } else if (ejercicio === 'peso_muerto') {
    intentos = [
      { peso: row.primer_intento_peso_muerto, valido: row.valido_d1, field: 'primer_intento_peso_muerto' },
      { peso: row.segundo_intento_peso_muerto, valido: row.valido_d2, field: 'segundo_intento_peso_muerto' },
      { peso: row.tercer_intento_peso_muerto, valido: row.valido_d3, field: 'tercer_intento_peso_muerto' }
    ]
  }

  const intentosValidos = intentos.filter(i => i.peso && (i.valido !== false))
  if (intentosValidos.length === 0) return null
  
  const mejorIntento = intentosValidos.reduce((max, current) => 
    current.peso > max.peso ? current : max
  )
  
  return mejorIntento.field
}

const renderIntentoCell = (params, field, validoField, onCellClick, ejercicio) => {
  const peso = params.row[field]
  const valido = params.row[validoField]
  const mejorField = getMejorIntento(params.row, ejercicio)
  const esMejor = mejorField === field
  
  if (!peso && peso !== 0) return (
    <Box 
      sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      -
    </Box>
  )
  
  return (
    <Box 
      sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 0.5,
        cursor: 'pointer',
        bgcolor: esMejor ? '#fff3e0' : 'transparent',
        borderRadius: 1,
        fontWeight: esMejor ? 'bold' : 'normal',
        color: esMejor ? '#e65100' : 'inherit',
        '&:hover': { opacity: 0.7 }
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (peso) {
          onCellClick(params.row, field)
        }
      }}
    >
      <span>{peso}</span>
      {valido === true && <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />}
      {valido === false && <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />}
    </Box>
  )
}

export const columnsIntentos = (onCellClick) => [
  { 
    field: 'apellido', 
    headerName: 'Atleta', 
    flex: 0.15, 
    align: 'center', 
    headerAlign: 'center',
    renderCell: (params) => `${params.row.apellido} ${params.row.nombre}`
  },
  { 
    field: 'tanda_id', 
    headerName: 'Tanda', 
    flex: 0.06, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
  },
  { 
    field: 'peso_corporal', 
    headerName: 'BW', 
    flex: 0.08, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
  },
  { 
    field: 'categoria', 
    headerName: 'Categoría', 
    flex: 0.1, 
    align: 'center', 
    headerAlign: 'center' 
  },
  { 
    field: 'modalidad', 
    headerName: 'Modalidad', 
    flex: 0.12, 
    align: 'center', 
    headerAlign: 'center' 
  },
  { 
    field: 'primer_intento_sentadilla', 
    headerName: 'S1', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'primer_intento_sentadilla', 'valido_s1', onCellClick, 'sentadilla')
  },
  { 
    field: 'segundo_intento_sentadilla', 
    headerName: 'S2', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'segundo_intento_sentadilla', 'valido_s2', onCellClick, 'sentadilla')
  },
  { 
    field: 'tercer_intento_sentadilla', 
    headerName: 'S3', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'tercer_intento_sentadilla', 'valido_s3', onCellClick, 'sentadilla')
  },
  { 
    field: 'primer_intento_banco', 
    headerName: 'B1', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'primer_intento_banco', 'valido_b1', onCellClick, 'banco')
  },
  { 
    field: 'segundo_intento_banco', 
    headerName: 'B2', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'segundo_intento_banco', 'valido_b2', onCellClick, 'banco')
  },
  { 
    field: 'tercer_intento_banco', 
    headerName: 'B3', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'tercer_intento_banco', 'valido_b3', onCellClick, 'banco')
  },
  { 
    field: 'primer_intento_peso_muerto', 
    headerName: 'D1', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'primer_intento_peso_muerto', 'valido_d1', onCellClick, 'peso_muerto')
  },
  { 
    field: 'segundo_intento_peso_muerto', 
    headerName: 'D2', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'segundo_intento_peso_muerto', 'valido_d2', onCellClick, 'peso_muerto')
  },
  { 
    field: 'tercer_intento_peso_muerto', 
    headerName: 'D3', 
    flex: 0.07, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    editable: true,
    valueParser: (value) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) || parsed < 0 || parsed > 500 ? null : parsed
    },
    preProcessEditCellProps: (params) => {
      const value = parseFloat(params.props.value)
      const hasError = isNaN(value) || value < 0 || value > 500
      return { ...params.props, error: hasError }
    },
    renderCell: (params) => renderIntentoCell(params, 'tercer_intento_peso_muerto', 'valido_d3', onCellClick, 'peso_muerto')
  },
  { 
    field: 'total', 
    headerName: 'TOTAL', 
    flex: 0.08, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    renderCell: (params) => params.value || '-'
  },
  { 
    field: 'puesto', 
    headerName: 'PUESTO', 
    flex: 0.08, 
    align: 'center', 
    headerAlign: 'center',
    renderCell: (params) => params.value || '-'
  },
  { 
    field: 'dots', 
    headerName: 'DOTS', 
    flex: 0.08, 
    align: 'center', 
    headerAlign: 'center',
    type: 'number',
    renderCell: (params) => params.value ? params.value.toFixed(2) : '-'
  },
]
