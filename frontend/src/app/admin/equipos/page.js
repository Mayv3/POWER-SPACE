'use client'

import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Stack, TextField, InputAdornment,
  CircularProgress, Avatar, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Chip,
  Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import { Search as SearchIcon, GroupAdd as GroupAddIcon, Groups as GroupsIcon, MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon, SupervisorAccount as SupervisorAccountIcon, ExpandMore as ExpandIcon, EmojiEvents as TrophyIcon, Info as InfoIcon } from '@mui/icons-material'
import { GenericModal } from '../../../components/modales/GenericModal'
import { EquipoForm } from '../../../components/modales/EquipoForm'
import { DeleteGenericModal } from '../../../components/modales/DeleteGenericModal'
import { AsignarAtletasModal } from '../../../components/modales/AsignarAtletasModal'
import { useDarkMode } from '../../../context/ThemeContext'
import { capitalizeWords } from '../../../utils/textUtils'
import { colorCategoria } from '../../../utils/colorCategoria'
import { Calculate_DOTS } from '../../../utils/calcularDots'
import { Calculate_IPF_GL, Calculate_IPF_Points } from '../../../utils/calcularIPF'
import { apiFetch } from '../../../lib/api'
import { CoachesManager } from '../../../components/admin/CoachesManager'
import { claveCategoriaAtleta } from '../../../const/categorias/categorias'

const EMPTY_EQUIPO = { nombre: '', foto: null, color: '#F57C00', coach_id: '' }

function CardMenu({ onEdit, onDelete }) {
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        aria-label="Acciones del equipo"
        sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <MoreVertIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { elevation: 3, sx: { borderRadius: 2, minWidth: 140 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { onEdit(); setAnchor(null) }}>
          <ListItemIcon><EditIcon sx={{ fontSize: 20 }} htmlColor="#FF9800" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { onDelete(); setAnchor(null) }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 20 }} htmlColor="#d32f2f" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', color: 'error.main' }}>Eliminar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

const MEDAL = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
const fmtNum = (n) => (n || n === 0 ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')

function completarMetricasPremiacion(atleta) {
  const totalizo = atleta.totalizo ?? (
    atleta.sentadilla > 0 && atleta.banco > 0 && atleta.peso_muerto > 0
  )
  const peso = Number(atleta.peso_corporal) || 0
  const total = Number(atleta.total) || 0
  const esFemenino = atleta.sexo === 'F'
  const equipado = String(atleta.modalidad || '').toLowerCase().includes('equip')
  const dots = Number(atleta.dots) || (
    totalizo && peso > 0 ? Number(Calculate_DOTS(peso, total, esFemenino)) : 0
  )
  const ipfGl = Number(atleta.ipf_gl) || (
    totalizo ? Calculate_IPF_GL(peso, total, esFemenino, equipado) : 0
  )
  const ipfPoints = Number(atleta.ipf_points) || (
    totalizo ? Calculate_IPF_Points(peso, total, esFemenino, equipado) : 0
  )
  return { ...atleta, totalizo, dots, ipf_gl: ipfGl, ipf_points: ipfPoints }
}

function PremiacionView({ premiacion, isLoading, surface, border, isDark }) {
  const muted = isDark ? '#9aa0ab' : '#6b7280'

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress size={40} sx={{ color: '#FF9800' }} />
      </Box>
    )
  }
  if (!premiacion || premiacion.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1, color: 'text.secondary' }}>
        <TrophyIcon sx={{ fontSize: 56 }} style={{ opacity: 0.4 }} />
        <Typography>No hay datos de premiación.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="flex-start"
        sx={{
          mb: 1.5, px: 1.5, py: 1.25,
          borderRadius: 1.5,
          bgcolor: isDark ? '#202622' : '#f5faf7',
          color: muted,
        }}
      >
        <InfoIcon sx={{ fontSize: 18, color: '#8aa9a0', mt: 0.1 }} />
        <Box>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: 'text.primary' }}>
            Clasificación general por IPF GL
          </Typography>
          <Typography variant="caption">
            Puntaje por puesto: 1°=12, 2°=9, 3°=8, 4°=7 … 10°+=1. Los cinco mejores aportes conforman el total del equipo.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1}>
        {premiacion.map((eq) => {
          const color = eq.color || '#9e9e9e'
          const medal = MEDAL[eq.posicion]
          // Solo los top 5 que aportan puntos al equipo.
          const filas = (eq.detalle || []).filter((a) => a.cuenta_para_equipo)
          return (
            <Accordion
              key={eq.id}
              disableGutters
              elevation={0}
              sx={{
                borderRadius: 2, border: `1px solid ${border}`, backgroundColor: surface,
                overflow: 'hidden', '&:before': { display: 'none' },
                transition: 'background-color .2s ease, box-shadow .2s ease',
                '&.Mui-expanded': {
                  boxShadow: isDark ? '0 10px 28px rgba(0,0,0,.22)' : '0 10px 28px rgba(24,39,31,.08)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={null}
                sx={{
                  pl: 0, pr: 0, py: 0, minHeight: 72,
                  '&.Mui-expanded': { minHeight: 72 },
                  '& .MuiAccordionSummary-content': { my: 0, minHeight: 72, alignItems: 'stretch' },
                  '& .MuiAccordionSummary-content.Mui-expanded': { my: 0 },
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.025)' : 'rgba(15,90,55,.025)' },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0, minHeight: 72 }}>
                  {/* Posición */}
                  <Box sx={{
                    width: 54, minHeight: 72, px: 1, borderRadius: 0, flexShrink: 0, alignSelf: 'stretch',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 17,
                    bgcolor: medal ? `${medal}${isDark ? '22' : '2B'}` : (isDark ? '#343434' : '#eceff1'),
                    color: medal || 'text.secondary',
                  }}>
                    {eq.posicion}°
                  </Box>
                  <Avatar src={eq.foto || undefined} sx={{ width: 44, height: 44, bgcolor: color, flexShrink: 0 }}>
                    <GroupsIcon sx={{ fontSize: 22 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={800} noWrap sx={{ lineHeight: 1.2 }}>
                      {capitalizeWords(eq.nombre)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: muted }} noWrap>
                      {eq.coach?.nombre ? capitalizeWords(eq.coach.nombre) : 'Sin coach'} · {eq.num_totalizaron}/{eq.num_atletas} totalizaron
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48, minHeight: 72, flexShrink: 0, alignSelf: 'stretch',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ExpandIcon
                      sx={{
                        fontSize: 20, color: 'text.secondary',
                        transition: 'transform .2s ease',
                        '.Mui-expanded &': { transform: 'rotate(180deg)' },
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      textAlign: 'center', flexShrink: 0, width: 82, minHeight: 72,
                      px: 1, py: 0.7, borderRadius: 0, alignSelf: 'stretch',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      bgcolor: isDark ? 'rgba(245,124,0,.12)' : 'rgba(245,124,0,.09)',
                    }}
                  >
                    <Typography fontWeight={900} sx={{ fontSize: 20, lineHeight: 1, color: '#F57C00' }}>
                      {eq.puntaje}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontSize: '0.63rem', color: muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>puntos</Typography>
                  </Box>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0, borderTop: `1px solid ${border}` }}>
                {filas.length === 0 ? (
                  <Typography variant="body2" sx={{ px: 2, py: 1.5, color: muted }}>
                    Sin atletas que puntúen en este equipo.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { px: { xs: 1, md: 1.5 } } }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: isDark ? '#111d18' : '#f5faf7' }}>
                          <TableCell sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Pto.</TableCell>
                          <TableCell sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Atleta</TableCell>
                          <TableCell sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Categoría</TableCell>
                          <TableCell align="right" sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Peso</TableCell>
                          <TableCell align="right" sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Total</TableCell>
                          <Tooltip title="IPF GoodLift (fórmula oficial actual)"><TableCell align="right" sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800 }}>IPF GL</TableCell></Tooltip>
                          <Tooltip title="IPF Points (fórmula anterior)"><TableCell align="right" sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800 }}>IPF PTS</TableCell></Tooltip>
                          <TableCell align="right" sx={{ color: '#8aa9a0', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Aporta</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filas.map((a) => (
                          <TableRow
                            key={a.atleta_id}
                            hover
                            sx={{ opacity: a.totalizo ? 1 : 0.5, '&:last-child td': { borderBottom: 0 } }}
                          >
                            <TableCell>{a.totalizo ? a.puesto : '—'}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                              {capitalizeWords(`${a.nombre} ${a.apellido || ''}`)}
                              {!a.totalizo && (
                                <Chip label="No totalizó" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{claveCategoriaAtleta(a)} · {a.modalidad || '—'}</TableCell>
                            <TableCell align="right">{a.peso_corporal ?? '—'} kg</TableCell>
                            <TableCell align="right">{a.total > 0 ? `${a.total} kg` : '—'}</TableCell>
                            <TableCell align="right">{a.totalizo ? fmtNum(a.ipf_gl) : '—'}</TableCell>
                            <TableCell align="right">{a.totalizo ? fmtNum(a.ipf_points) : '—'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: a.puntos ? '#F57C00' : muted }}>{a.puntos}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Stack>
    </Box>
  )
}

function PremiacionCategoriasView({ premiacion, isLoading, surface, border, isDark }) {
  const muted = isDark ? '#9aa0ab' : '#6b7280'

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress size={40} sx={{ color: '#FF9800' }} />
      </Box>
    )
  }
  if (!premiacion || premiacion.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1, color: 'text.secondary' }}>
        <TrophyIcon sx={{ fontSize: 56 }} style={{ opacity: 0.4 }} />
        <Typography>No hay datos de premiación por categoría.</Typography>
      </Box>
    )
  }

  // Respaldo local con las mismas fórmulas de /publico. También corrige respuestas
  // antiguas conservadas por HMR y vuelve a asignar puestos por DOTS.
  const premiacionNormalizada = premiacion.map((grupo) => ({
    ...grupo,
    detalle: (grupo.detalle || [])
      .map(completarMetricasPremiacion)
      .sort((a, b) => (b.dots || 0) - (a.dots || 0))
      .map((atleta, index) => ({ ...atleta, puesto: index + 1 })),
  }))

  const secciones = [
    {
      key: 'femenino',
      label: 'Femenino',
      color: '#ec407a',
      grupos: premiacionNormalizada.filter((grupo) => String(grupo.sexo || '').trim().toUpperCase().startsWith('F')),
    },
    {
      key: 'masculino',
      label: 'Masculino',
      color: '#1976d2',
      grupos: premiacionNormalizada.filter((grupo) => !String(grupo.sexo || '').trim().toUpperCase().startsWith('F')),
    },
  ]

  return (
    <Stack spacing={2.25} sx={{ width: '100%', maxWidth: 'none' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25, color: muted }}>
        <InfoIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption">
          Mismo ranking provisional de la vista pública: atletas agrupados por categoría y ordenados por DOTS.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {secciones.map((seccion) => (
          <Box key={seccion.key} sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              mb: 1, px: 1.5, py: 0.9,
              bgcolor: `${seccion.color}${isDark ? '18' : '0D'}`,
            }}
          >
            <Typography sx={{ fontWeight: 900, color: seccion.color, letterSpacing: 0.4 }}>
              {seccion.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {seccion.grupos.length} {seccion.grupos.length === 1 ? 'categoría' : 'categorías'}
            </Typography>
          </Stack>

          {seccion.grupos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No hay categorías cargadas.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {seccion.grupos.map((grupo) => {
                const ganador = grupo.detalle?.find((atleta) => atleta.puesto === 1)
                const nombreCategoria = claveCategoriaAtleta(grupo)
                const color = colorCategoria(nombreCategoria)
                return (
          <Accordion
            key={grupo.clave}
            disableGutters
            elevation={0}
            sx={{
              border: `1px solid ${border}`, borderRadius: 2,
              backgroundColor: surface, overflow: 'hidden',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandIcon sx={{ fontSize: 20 }} />}
              sx={{
                pl: 0, pr: 0, minHeight: 64,
                '&.Mui-expanded': { minHeight: 64 },
                '& .MuiAccordionSummary-content': { my: 0, minHeight: 64, alignItems: 'stretch' },
                '& .MuiAccordionSummary-content.Mui-expanded': { my: 0 },
                '& .MuiAccordionSummary-expandIconWrapper': {
                  width: 44, minHeight: 64, justifyContent: 'center',
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
                <Box
                  sx={{
                    width: 110, minHeight: 64, px: 1, borderRadius: 0,
                    flexShrink: 0, alignSelf: 'stretch',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: `${color}${isDark ? '25' : '14'}`,
                    border: `1px solid ${color}70`,
                    color, fontWeight: 900,
                  }}
                >
                  {nombreCategoria}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={800} noWrap>
                    {grupo.modalidad} · {grupo.sexo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {grupo.totalizaron}/{grupo.participantes} totalizaron
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="caption" sx={{ color: '#8aa9a0', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    1° puesto
                  </Typography>
                  <Typography fontWeight={800} noWrap>
                    {ganador ? capitalizeWords(`${ganador.nombre} ${ganador.apellido || ''}`) : 'Sin premiación'}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    minWidth: 860,
                    '& .MuiTableCell-root': { px: 0.75, whiteSpace: 'nowrap', fontSize: '0.75rem' },
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? '#111d18' : '#f5faf7' }}>
                      <TableCell sx={{ width: 64, color: muted }}>Puesto</TableCell>
                      <TableCell sx={{ color: muted }}>Atleta</TableCell>
                      <TableCell align="right" sx={{ color: muted }}>Peso corporal</TableCell>
                      <TableCell align="right" sx={{ color: muted }}>Sentadilla</TableCell>
                      <TableCell align="right" sx={{ color: muted }}>Banco</TableCell>
                      <TableCell align="right" sx={{ color: muted }}>Peso muerto</TableCell>
                      <TableCell align="right" sx={{ color: muted, fontWeight: 800 }}>Total</TableCell>
                      <TableCell align="right" sx={{ color: muted, fontWeight: 800 }}>DOTS</TableCell>
                      <TableCell align="right" sx={{ color: muted }}>IPF GL</TableCell>
                      <TableCell align="right" sx={{ color: muted }}>IPF Pts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(grupo.detalle || []).map((atleta) => {
                      const medal = MEDAL[atleta.puesto]
                      return (
                        <TableRow
                          key={atleta.atleta_id}
                          sx={{ opacity: atleta.totalizo ? 1 : 0.5, '&:last-child td': { borderBottom: 0 } }}
                        >
                          <TableCell sx={{ p: 0, width: 52 }}>
                            {atleta.puesto ? (
                              <Typography
                                component="span"
                                sx={{
                                  display: 'flex', width: '100%', minHeight: 48, px: 0.75,
                                  alignItems: 'center', justifyContent: 'center',
                                  borderRadius: 0,
                                  bgcolor: medal ? `${medal}${isDark ? '20' : '2B'}` : 'transparent',
                                  color: medal || 'text.secondary',
                                  fontSize: '0.78rem', fontWeight: 900,
                                }}
                              >
                                {atleta.puesto}°
                              </Typography>
                            ) : '—'}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" fontWeight={atleta.puesto && atleta.puesto <= 3 ? 800 : 500}>
                              {capitalizeWords(`${atleta.nombre} ${atleta.apellido || ''}`)}
                            </Typography>
                            {!atleta.totalizo && <Typography variant="caption" color="text.secondary">No totalizó</Typography>}
                          </TableCell>
                          <TableCell align="right">{atleta.peso_corporal ?? '—'} kg</TableCell>
                          <TableCell align="right">{atleta.sentadilla || '—'}{atleta.sentadilla ? ' kg' : ''}</TableCell>
                          <TableCell align="right">{atleta.banco || '—'}{atleta.banco ? ' kg' : ''}</TableCell>
                          <TableCell align="right">{atleta.peso_muerto || '—'}{atleta.peso_muerto ? ' kg' : ''}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900 }}>{atleta.total || '—'}{atleta.total ? ' kg' : ''}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900, color: atleta.dots ? '#F57C00' : 'text.secondary' }}>
                            {atleta.dots ? fmtNum(atleta.dots) : '—'}
                          </TableCell>
                          <TableCell align="right">{atleta.ipf_gl ? fmtNum(atleta.ipf_gl) : '—'}</TableCell>
                          <TableCell align="right">{atleta.ipf_points ? fmtNum(atleta.ipf_points) : '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
                )
              })}
            </Stack>
          )}
          </Box>
        ))}
      </Box>
    </Stack>
  )
}

function EquiposManager({
  equipos, isLoading, searchTerm, setSearchTerm,
  surface, border, isDark, onCreate, onEdit, onDelete, onAsignar,
}) {
  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 164px', minHeight: 70,
          bgcolor: isDark ? '#111d18' : '#f5faf7',
          border: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
          borderBottom: 0, borderRadius: '12px 12px 0 0', overflow: 'hidden',
        }}
      >
        <Box sx={{ minWidth: 0, px: 1.5, py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Nombre del equipo o coach..."
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
        <Button
          onClick={onCreate}
          sx={{
            borderRadius: 0, borderLeft: `1px solid ${isDark ? '#244238' : '#d6e7df'}`,
            color: '#F57C00', textTransform: 'none',
            '&:hover': { bgcolor: isDark ? 'rgba(245,124,0,.09)' : 'rgba(245,124,0,.07)' },
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center">
            <GroupAddIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>Nuevo equipo</Typography>
          </Stack>
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress size={40} sx={{ color: '#FF9800' }} />
          </Box>
        ) : equipos.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 1, color: 'text.secondary' }}>
            <GroupsIcon sx={{ fontSize: 56 }} style={{ opacity: 0.4 }} />
            <Typography>No hay equipos cargados.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ border: `1px solid ${border}`, borderRadius: '0 0 12px 12px', backgroundColor: surface, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? '#111d18' : '#f5faf7' }}>
                  <TableCell sx={{ color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Equipo</TableCell>
                  <TableCell sx={{ color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Coach</TableCell>
                  <TableCell sx={{ color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Color</TableCell>
                  <TableCell align="right" sx={{ width: 72, color: '#8aa9a0', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equipos.map((equipo) => {
                  const color = equipo.color || '#9e9e9e'
                  return (
                    <TableRow key={equipo.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Avatar src={equipo.foto || undefined} sx={{ width: 38, height: 38, bgcolor: color }}>
                            <GroupsIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Typography fontWeight={800} noWrap>{capitalizeWords(equipo.nombre)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: equipo.coach?.nombre ? 'text.primary' : 'text.secondary' }}>
                          <SupervisorAccountIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2" noWrap>
                            {equipo.coach?.nombre ? capitalizeWords(equipo.coach.nombre) : 'Sin coach'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 18, height: 18, borderRadius: 0.75, bgcolor: color, border: `1px solid ${border}` }} />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{color.toUpperCase()}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title="Asignar atletas">
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onAsignar(equipo) }}
                              aria-label="Asignar atletas"
                              sx={{ color: '#F57C00', '&:hover': { bgcolor: 'rgba(245,124,0,.09)' } }}
                            >
                              <PersonAddIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                          <CardMenu onEdit={() => onEdit(equipo)} onDelete={() => onDelete(equipo)} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  )
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState([])
  const [equiposFiltrados, setEquiposFiltrados] = useState([])
  const [coaches, setCoaches] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [vista, setVista] = useState('equipos')
  const [tipoPremiacion, setTipoPremiacion] = useState('equipos')
  const [premiacion, setPremiacion] = useState([])
  const [loadingPremiacion, setLoadingPremiacion] = useState(false)
  const [premiacionCategorias, setPremiacionCategorias] = useState([])
  const [loadingPremiacionCategorias, setLoadingPremiacionCategorias] = useState(false)

  const [openEdit, setOpenEdit] = useState(false)
  const [selectedEquipo, setSelectedEquipo] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [equipoToDelete, setEquipoToDelete] = useState({})
  const [loadingDelete, setLoadingDelete] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [newEquipo, setNewEquipo] = useState(EMPTY_EQUIPO)

  const [openAsignar, setOpenAsignar] = useState(false)
  const [equipoParaAsignar, setEquipoParaAsignar] = useState(null)

  const { isDark } = useDarkMode()
  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border = isDark ? '#3a3a3a' : '#e0e0e0'

  const fetchEquipos = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/equipos`)
      const data = await res.json()
      setEquipos(data)
      setEquiposFiltrados(data)
    } catch (err) {
      console.error('Error al cargar equipos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCoaches = async () => {
    try {
      const res = await apiFetch(`/api/coaches`)
      const data = await res.json()
      setCoaches(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar coaches:', err)
    }
  }

  const fetchPremiacion = async () => {
    setLoadingPremiacion(true)
    try {
      const res = await apiFetch(`/api/equipos/premiacion`)
      const data = await res.json()
      setPremiacion(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar premiación:', err)
    } finally {
      setLoadingPremiacion(false)
    }
  }

  const fetchPremiacionCategorias = async () => {
    setLoadingPremiacionCategorias(true)
    try {
      const res = await apiFetch('/api/equipos/premiacion-categorias', { cache: 'no-store' })
      const data = await res.json()
      setPremiacionCategorias(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar premiación por categoría:', err)
    } finally {
      setLoadingPremiacionCategorias(false)
    }
  }

  useEffect(() => { fetchEquipos(); fetchCoaches() }, [])

  useEffect(() => { if (vista === 'premiacion') fetchPremiacion() }, [vista])

  useEffect(() => {
    if (vista === 'premiacion' && tipoPremiacion === 'categorias') fetchPremiacionCategorias()
  }, [vista, tipoPremiacion])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (['equipos', 'premiacion'].includes(tab)) setVista(tab)
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setEquiposFiltrados(equipos)
    } else {
      const q = searchTerm.toLowerCase()
      setEquiposFiltrados(
        equipos.filter(e =>
          e.nombre?.toLowerCase().includes(q) ||
          e.coach?.nombre?.toLowerCase().includes(q)
        )
      )
    }
  }, [searchTerm, equipos])

  const handleEdit = (equipo) => {
    setSelectedEquipo({ ...equipo, coach_id: equipo.coach_id || '' })
    setOpenEdit(true)
  }

  const handleSaveEdit = async () => {
    if (loadingEdit) return
    if (!selectedEquipo.nombre?.trim()) { alert('El nombre es obligatorio.'); return }
    setLoadingEdit(true)
    try {
      const res = await apiFetch(`/api/equipos/${selectedEquipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: selectedEquipo.nombre,
          foto: selectedEquipo.foto,
          color: selectedEquipo.color,
          coach_id: selectedEquipo.coach_id || null,
        }),
      })
      if (!res.ok) throw new Error()
      await fetchEquipos()
      setOpenEdit(false)
    } catch (err) {
      console.error('Error al editar equipo:', err)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleCreate = async () => {
    if (loadingCreate) return
    if (!newEquipo.nombre?.trim()) { alert('El nombre es obligatorio.'); return }
    setLoadingCreate(true)
    try {
      const res = await apiFetch(`/api/equipos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newEquipo.nombre,
          foto: newEquipo.foto,
          color: newEquipo.color,
          coach_id: newEquipo.coach_id || null,
        }),
      })
      if (!res.ok) throw new Error()
      await fetchEquipos()
      setOpenCreate(false)
      setNewEquipo(EMPTY_EQUIPO)
    } catch (err) {
      console.error('Error al crear equipo:', err)
      alert('No se pudo crear el equipo.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleAsignar = (equipo) => { setEquipoParaAsignar(equipo); setOpenAsignar(true) }

  const handleDelete = (equipo) => { setEquipoToDelete(equipo); setOpenDelete(true) }

  const confirmDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      const res = await apiFetch(`/api/equipos/${equipoToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      await fetchEquipos()
      setOpenDelete(false)
    } catch (err) {
      console.error('Error al eliminar equipo:', err)
      alert('Hubo un error al eliminar el equipo.')
    } finally {
      setLoadingDelete(false)
    }
  }

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista)
    const url = new URL(window.location.href)
    if (nuevaVista === 'equipos') url.searchParams.delete('tab')
    else url.searchParams.set('tab', nuevaVista)
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          Equipos
        </Typography>
      </Stack>

      <Tabs
        value={vista}
        onChange={(e, v) => cambiarVista(v)}
        sx={{ borderBottom: `1px solid ${border}`, minHeight: 40, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40 }, '& .Mui-selected': { color: '#F57C00 !important' }, '& .MuiTabs-indicator': { backgroundColor: '#F57C00' } }}
      >
        <Tab value="equipos" label="Equipos" icon={<GroupsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab value="premiacion" label="Premiación" icon={<TrophyIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {vista === 'premiacion' && (
        <Tabs
          value={tipoPremiacion}
          onChange={(e, value) => setTipoPremiacion(value)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36, minWidth: 130, py: 0.5,
              textTransform: 'none', fontSize: '0.82rem', fontWeight: 700,
            },
            '& .Mui-selected': { color: '#F57C00 !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#F57C00' },
          }}
        >
          <Tab value="equipos" label="Por equipos" />
          <Tab value="categorias" label="Por categoría" />
        </Tabs>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 2 }}>
        {vista === 'equipos' ? (
          <Box
            sx={{
              height: '100%', minHeight: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
              gap: 2,
            }}
          >
            <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <GroupsIcon sx={{ fontSize: 20, color: '#F57C00' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Equipos</Typography>
                <Typography variant="caption" color="text.secondary">— a qué equipo pertenece cada atleta</Typography>
              </Stack>
              <EquiposManager
                equipos={equiposFiltrados}
                isLoading={isLoading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                surface={surface}
                border={border}
                isDark={isDark}
                onCreate={() => setOpenCreate(true)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAsignar={handleAsignar}
              />
            </Box>

            <Box sx={{
              borderColor: border,
              borderStyle: 'solid',
              borderWidth: { xs: '1px 0 0 0', lg: '0 0 0 1px' },
              my: { xs: 1, lg: 0 },
            }} />

            <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <SupervisorAccountIcon sx={{ fontSize: 20, color: '#F57C00' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Coaches</Typography>
                <Typography variant="caption" color="text.secondary">— personas responsables, no son equipos</Typography>
              </Stack>
              <CoachesManager onCoachesChange={async () => { await Promise.all([fetchCoaches(), fetchEquipos()]) }} />
            </Box>
          </Box>
        ) : vista === 'premiacion' ? (
          tipoPremiacion === 'categorias' ? (
            <PremiacionCategoriasView
              premiacion={premiacionCategorias}
              isLoading={loadingPremiacionCategorias}
              surface={surface}
              border={border}
              isDark={isDark}
            />
          ) : (
            <PremiacionView premiacion={premiacion} isLoading={loadingPremiacion} surface={surface} border={border} isDark={isDark} />
          )
        ) : (
          null
        )}
      </Box>

      <GenericModal
        open={openEdit}
        title="Editar equipo"
        subtitle="Actualizá su identidad y coach responsable."
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
        loading={loadingEdit}
        saveDisabled={!selectedEquipo.nombre?.trim()}
      >
        <EquipoForm equipo={selectedEquipo} onChange={setSelectedEquipo} coaches={coaches} />
      </GenericModal>

      <GenericModal
        open={openCreate}
        title="Crear nuevo equipo"
        subtitle="Definí la identidad del equipo y su responsable."
        onClose={() => setOpenCreate(false)}
        onSave={handleCreate}
        loading={loadingCreate}
        saveDisabled={!newEquipo.nombre?.trim()}
      >
        <EquipoForm equipo={newEquipo} onChange={setNewEquipo} coaches={coaches} />
      </GenericModal>

      <AsignarAtletasModal
        open={openAsignar}
        equipo={equipoParaAsignar}
        onClose={() => setOpenAsignar(false)}
        onAssigned={fetchEquipos}
      />

      <DeleteGenericModal
        open={openDelete}
        title="Eliminar equipo"
        nombre={equipoToDelete?.nombre}
        descripcion={equipoToDelete?.coach?.nombre ? `Coach: ${equipoToDelete.coach.nombre}` : null}
        onClose={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
        loading={loadingDelete}
      />
    </Box>
  )
}
