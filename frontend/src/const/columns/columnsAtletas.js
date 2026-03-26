import { useState } from 'react'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Divider } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { capitalizeWords } from '../../utils/textUtils'

function ActionsMenu({ row, handleEdit, handleDelete }) {
  const [anchor, setAnchor] = useState(null)

  const open = (e) => { e.stopPropagation(); setAnchor(e.currentTarget) }
  const close = () => setAnchor(null)

  return (
    <>
      <IconButton size="small" onClick={open}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{ paper: { elevation: 3, sx: { borderRadius: 2, minWidth: 140 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { handleEdit(row); close() }}>
          <ListItemIcon><EditIcon fontSize="small" sx={{ color: '#FF9800' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleDelete(row); close() }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', color: 'error.main' }}>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

export const columnsAtletas = (handleEdit, handleDelete) => [
  {
    field: 'nombre',
    headerName: 'Nombre',
    flex: 0.18,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => capitalizeWords(params.value),
  },
  {
    field: 'apellido',
    headerName: 'Apellido',
    flex: 0.18,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => capitalizeWords(params.value),
  },
  {
    field: 'peso_corporal',
    headerName: 'Peso (kg)',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    renderCell: (params) => params.value ? `${params.value} kg` : '-',
  },
  {
    field: 'categoria',
    headerName: 'Categoría',
    flex: 0.15,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => params.value ? (
      <Chip label={params.value} size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
    ) : '-',
  },
  {
    field: 'tanda_id',
    headerName: 'Tanda',
    flex: 0.1,
    align: 'center',
    headerAlign: 'center',
    cellClassName: (params) => params.value ? `tanda-${params.value}` : '',
    renderCell: (params) => {
      const colors = { 1: '#1976d2', 2: '#388e3c', 3: '#F57C00', 4: '#7b1fa2' }
      const color = colors[params.value]
      return params.value ? (
        <Chip
          label={`Tanda ${params.value}`}
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: color, color: '#fff', border: 'none' }}
        />
      ) : '-'
    },
  },
  {
    field: 'primer_intento_sentadilla',
    headerName: 'Sentadilla',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    headerClassName: 'header-sentadilla',
    renderCell: (params) => params.value ? `${params.value} kg` : '-',
  },
  {
    field: 'primer_intento_banco',
    headerName: 'Banco',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    headerClassName: 'header-banco',
    renderCell: (params) => params.value ? `${params.value} kg` : '-',
  },
  {
    field: 'primer_intento_peso_muerto',
    headerName: 'Peso muerto',
    flex: 0.13,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    headerClassName: 'header-peso-muerto',
    renderCell: (params) => params.value ? `${params.value} kg` : '-',
  },
  {
    field: 'acciones',
    headerName: '',
    width: 48,
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <ActionsMenu row={params.row} handleEdit={handleEdit} handleDelete={handleDelete} />
    ),
  },
]
