import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
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

export const columnsCoaches = (handleEdit, handleDelete) => [
  {
    field: 'nombre',
    headerName: 'Nombre',
    flex: 1,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => capitalizeWords(params.value || '-'),
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
