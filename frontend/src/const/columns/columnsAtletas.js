import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Divider, Avatar } from '@mui/material'
import { Groups as GroupsIcon, Person as PersonIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { capitalizeWords } from '../../utils/textUtils'
import { colorCategoria } from '../../utils/colorCategoria'

function ActionsMenu({ row, handleEdit, handleDelete }) {
  const [anchor, setAnchor] = useState(null)

  const open = (e) => { e.stopPropagation(); setAnchor(e.currentTarget) }
  const close = () => setAnchor(null)

  return (
    <>
      <IconButton size="small" onClick={open}>
        <MoreVertIcon sx={{ fontSize: 20 }} />
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
          <ListItemIcon><EditIcon sx={{ fontSize: 20 }} htmlColor="#FF9800" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleDelete(row); close() }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 20 }} htmlColor="#d32f2f" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', color: 'error.main' }}>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

export const columnsAtletas = (handleEdit, handleDelete) => [
  {
    field: 'lot',
    headerName: 'Lot',
    flex: 0.06,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    renderCell: (params) => params.value ?? '-',
  },
  {
    field: 'nombre',
    headerName: 'Nombre',
    flex: 0.2,
    align: 'left',
    headerAlign: 'left',
    valueGetter: (value, row) => `${row.nombre ?? ''} ${row.apellido ?? ''}`.trim(),
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar src={params.row.foto || undefined} sx={{ width: 28, height: 28 }}>
          <PersonIcon sx={{ fontSize: 16 }} />
        </Avatar>
        {capitalizeWords(params.value)}
      </Box>
    ),
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
    cellClassName: 'cat-cell',
    renderCell: (params) => (
      <Box sx={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: params.value ? colorCategoria(params.value) : 'transparent',
        color: params.value ? '#fff' : 'inherit', fontWeight: 700, fontSize: '0.8rem',
      }}>
        {params.value || '-'}
      </Box>
    ),
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
    field: 'equipo',
    headerName: 'Equipo',
    flex: 0.15,
    align: 'center',
    headerAlign: 'center',
    valueGetter: (value, row) => row.equipo?.nombre ?? '',
    renderCell: (params) => {
      const eq = params.row.equipo
      if (!eq) return '-'
      return (
        <Chip
          avatar={
            <Avatar src={eq.foto || undefined} sx={{ bgcolor: eq.color || '#bdbdbd' }}>
              <GroupsIcon sx={{ fontSize: 14 }} />
            </Avatar>
          }
          label={eq.nombre}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: '0.72rem',
            bgcolor: eq.color || '#9e9e9e',
            color: '#fff',
            border: 'none',
            '& .MuiChip-avatar': { color: '#fff' },
          }}
        />
      )
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
