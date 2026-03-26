'use client'

import { useState } from 'react'
import {
  Box, Typography, Paper, Button, Grid,
  Snackbar, Alert, Stack, Divider, Chip,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GavelIcon from '@mui/icons-material/Gavel'
import { useDarkMode } from '../../../context/ThemeContext'

export default function JuecesPage() {
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const { isDark } = useDarkMode()

  const surface = isDark ? '#1a1a1a' : '#ffffff'
  const border  = isDark ? '#2a2a2a' : '#e0e0e0'

  const jueces = [
    { id: 1, nombre: 'Juez Secundario 1', rol: 'Lateral izquierdo', color: '#1976d2' },
    { id: 2, nombre: 'Juez Principal',    rol: 'Central',           color: '#388e3c' },
    { id: 3, nombre: 'Juez Secundario 2', rol: 'Lateral derecho',   color: '#d32f2f' },
  ]

  const getJuezUrl = (id) => `${window.location.origin}/jueces/${id}`

  const handleCopyLink = (id) => {
    navigator.clipboard.writeText(getJuezUrl(id))
    setSnackbarMessage('Link copiado al portapapeles')
    setOpenSnackbar(true)
  }

  const handleOpenLink = (id) => window.open(getJuezUrl(id), '_blank')

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Header */}
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>Jueces</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Abrí o copiá el link de cada juez para que puedan votar desde su dispositivo
        </Typography>
      </Box>

      {/* Cards */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Grid container spacing={3} sx={{ width: '100%', maxWidth: 1000, justifyContent: 'center' }}>
          {jueces.map((juez) => (
            <Grid item xs={12} md={4} key={juez.id} sx={{ display: 'flex' }}>
              <Paper
                elevation={0}
                onClick={() => handleOpenLink(juez.id)}
                sx={{
                  width: '100%',
                  border: `1px solid ${border}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  backgroundColor: surface,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px ${juez.color}30`,
                    borderColor: juez.color,
                  },
                }}
              >
                {/* Franja de color superior */}
                <Box sx={{ height: 6, backgroundColor: juez.color }} />

                <Box sx={{ p: 3 }}>
                  {/* Ícono + nombre */}
                  <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <Box sx={{
                      width: 52, height: 52, borderRadius: 2,
                      backgroundColor: `${juez.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <GavelIcon sx={{ fontSize: 28, color: juez.color }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        {juez.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {juez.rol}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: border, mb: 2 }} />

                  {/* URL */}
                  <Box sx={{
                    px: 1.5, py: 1, borderRadius: 1.5, mb: 2,
                    backgroundColor: isDark ? '#111' : '#f5f5f5',
                    fontFamily: 'monospace', fontSize: '0.8rem',
                    color: 'text.secondary', letterSpacing: 0.3,
                  }}>
                    /jueces/{juez.id}
                  </Box>

                  {/* Botones */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<OpenInNewIcon />}
                      onClick={(e) => { e.stopPropagation(); handleOpenLink(juez.id) }}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        backgroundColor: juez.color,
                        '&:hover': { backgroundColor: juez.color, filter: 'brightness(0.88)' },
                      }}
                    >
                      Abrir
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ContentCopyIcon />}
                      onClick={(e) => { e.stopPropagation(); handleCopyLink(juez.id) }}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: border,
                        color: 'text.primary',
                        '&:hover': { borderColor: juez.color, color: juez.color, backgroundColor: `${juez.color}08` },
                      }}
                    >
                      Copiar
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
