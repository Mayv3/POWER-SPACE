import { useState } from 'react'
import { Box, Avatar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon, Groups as GroupsIcon } from '@mui/icons-material'
import { capitalizeWords } from '../../utils/textUtils'

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

export const columnsEquipos = (handleEdit, handleDelete) => [
  {
    field: 'foto',
    headerName: '',
    width: 56,
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <Avatar
        src={params.value || undefined}
        sx={{ width: 30, height: 30, bgcolor: params.row.color || '#bdbdbd' }}
      >
        <GroupsIcon sx={{ fontSize: 18 }} />
      </Avatar>
    ),
  },
  {
    field: 'nombre',
    headerName: 'Nombre',
    flex: 0.4,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => capitalizeWords(params.value || '-'),
  },
  {
    field: 'color',
    headerName: 'Color',
    flex: 0.25,
    align: 'center',
    headerAlign: 'center',
    sortable: false,
    renderCell: (params) => (
      params.value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, height: '100%' }}>
          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: params.value, border: '1px solid rgba(0,0,0,0.2)' }} />
          <span style={{ fontSize: '0.8rem' }}>{params.value}</span>
        </Box>
      ) : '-'
    ),
  },
  {
    field: 'coach',
    headerName: 'Coach',
    flex: 0.35,
    align: 'left',
    headerAlign: 'left',
    valueGetter: (value, row) => row.coach?.nombre ?? '',
    renderCell: (params) => params.value ? capitalizeWords(params.value) : '-',
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
