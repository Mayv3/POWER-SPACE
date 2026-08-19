import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Divider, Avatar } from '@mui/material'
import { Groups as GroupsIcon, Person as PersonIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { capitalizeWords } from '../../utils/textUtils'
import { colorCategoria } from '../../utils/colorCategoria'
import { abreviarCategoriasEdad } from '../categorias/categorias'
import { letraTanda } from '../tandas'

// Fila pintada de borde a borde con el color de la categoría del atleta. La
// vista puede inyectar su propia paleta; tanda y equipo conservan su color.
const renderCeldaConCategoria = (row, contenido, getColorCategoria = colorCategoria) => (
  <Box sx={{
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
    bgcolor: row.categoria ? getColorCategoria(row.categoria) : 'transparent',
    color: row.categoria ? '#fff' : 'inherit', fontWeight: 600,
  }}>
    {contenido}
  </Box>
)

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

export const columnsAtletas = (handleEdit, handleDelete, getColorCategoria = colorCategoria) => [
  {
    field: 'lot',
    headerName: 'Lot',
    flex: 0.06,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(params.row, params.value ?? '-', getColorCategoria),
  },
  {
    field: 'nombre',
    headerName: 'Nombre',
    flex: 0.2,
    align: 'left',
    headerAlign: 'left',
    cellClassName: 'cat-cell',
    valueGetter: (value, row) => `${row.nombre ?? ''} ${row.apellido ?? ''}`.trim(),
    renderCell: (params) => (
      <Box sx={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, pl: 1.5,
        bgcolor: params.row.categoria ? getColorCategoria(params.row.categoria) : 'transparent',
        color: params.row.categoria ? '#fff' : 'inherit', fontWeight: 600,
      }}>
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
    editable: true,
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(params.row, params.value ? `${params.value} kg` : '-', getColorCategoria),
  },
  {
    field: 'categoria',
    headerName: 'Categoría de peso',
    flex: 0.15,
    align: 'center',
    headerAlign: 'center',
    cellClassName: 'cat-cell',
    renderCell: (params) => (
      <Box sx={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: params.value ? getColorCategoria(params.value) : 'transparent',
        color: params.value ? '#fff' : 'inherit', fontWeight: 700, fontSize: '0.8rem',
      }}>
        {params.value || '-'}
      </Box>
    ),
  },
  {
    field: 'categoria_edad',
    headerName: 'Categoría de edad',
    flex: 0.14,
    align: 'center',
    headerAlign: 'center',
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(
      params.row,
      abreviarCategoriasEdad(params.row.sexo, params.value).join(' / ') || '-',
      getColorCategoria
    ),
  },
  {
    field: 'tanda_id',
    headerName: 'Tanda',
    flex: 0.1,
    align: 'center',
    headerAlign: 'center',
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(
      params.row,
      params.value ? `Tanda ${letraTanda(params.value)}` : '-',
      getColorCategoria
    ),
  },
  {
    field: 'equipo',
    headerName: 'Equipo',
    flex: 0.15,
    align: 'center',
    headerAlign: 'center',
    cellClassName: 'cat-cell',
    valueGetter: (value, row) => row.equipo?.nombre ?? '',
    renderCell: (params) => {
      const eq = params.row.equipo
      const color = eq?.color
      return (
        <Box sx={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
          bgcolor: color || 'transparent', color: color ? '#fff' : 'inherit', fontWeight: 700, fontSize: '0.78rem',
        }}>
          {eq ? (
            <>
              <Avatar src={eq.foto || undefined} sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,.25)' }}>
                <GroupsIcon sx={{ fontSize: 14 }} />
              </Avatar>
              {capitalizeWords(eq.nombre)}
            </>
          ) : '-'}
        </Box>
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
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(params.row, params.value ? `${params.value} kg` : '-', getColorCategoria),
  },
  {
    field: 'primer_intento_banco',
    headerName: 'Banco',
    flex: 0.12,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    headerClassName: 'header-banco',
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(params.row, params.value ? `${params.value} kg` : '-', getColorCategoria),
  },
  {
    field: 'primer_intento_peso_muerto',
    headerName: 'Peso muerto',
    flex: 0.13,
    align: 'center',
    headerAlign: 'center',
    type: 'number',
    headerClassName: 'header-peso-muerto',
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(params.row, params.value ? `${params.value} kg` : '-', getColorCategoria),
  },
  {
    field: 'descalificado',
    headerName: 'Estado',
    flex: 0.1,
    align: 'center',
    headerAlign: 'center',
    type: 'boolean',
    cellClassName: 'cat-cell',
    renderCell: (params) => renderCeldaConCategoria(
      params.row,
      params.value
        ? <Chip label="Descalificado" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
        : '-',
      getColorCategoria
    ),
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
