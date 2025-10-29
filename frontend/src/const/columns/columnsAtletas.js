import { Box, IconButton, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { capitalizeWords } from '../../utils/textUtils'

export const columnsAtletas = (handleEdit, handleDelete) => [
  { 
    field: 'nombre', 
    headerName: 'Nombre', 
    flex: 0.15, 
    align: 'center', 
    headerAlign: 'center',
    renderCell: (params) => capitalizeWords(params.value)
  },
  { 
    field: 'apellido', 
    headerName: 'Apellido', 
    flex: 0.15, 
    align: 'center', 
    headerAlign: 'center',
    renderCell: (params) => capitalizeWords(params.value)
  },
  { field: 'dni', headerName: 'DNI', flex: 0.12, align: 'center', headerAlign: 'center' },
  {
    field: 'edad',
    headerName: 'Edad',
    flex: 0.1,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
  },
  {
    field: 'peso_corporal',
    headerName: 'Peso (kg)',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
  },
  {
    field: 'categoria',
    headerName: 'Categoría',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'modalidad',
    headerName: 'Modalidad',
    flex: 0.18,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => params.value || '-',
  },
  {
    field: 'tanda_id',
    headerName: 'Tanda',
    flex: 0.1,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (params.value ? `Tanda ${params.value}` : '-'),
  },
  {
    field: 'primer_intento_sentadilla',
    headerName: 'Sentadilla',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
  },
  {
    field: 'primer_intento_banco',
    headerName: 'Banco',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    renderCell: (params) => params.value ?? '-',
  },
  {
    field: 'primer_intento_peso_muerto',
    headerName: 'Peso muerto',
    flex: 0.14,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
  },
  {
    field: 'acciones',
    headerName: 'Acciones',
    flex: 0.12,
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <Box>
        <Tooltip title="Editar">
          <IconButton color="primary" onClick={() => handleEdit(params.row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton color="error" onClick={() => handleDelete(params.row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
]
