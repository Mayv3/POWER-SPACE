'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GavelIcon from '@mui/icons-material/Gavel'

export default function JuecesPage() {
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const jueces = [
    { id: 1, nombre: 'Juez 1', color: '#1976d2' },
    { id: 2, nombre: 'Juez 2', color: '#388e3c' },
    { id: 3, nombre: 'Juez 3', color: '#d32f2f' }
  ]

  const getJuezUrl = (id) => {
    return `${window.location.origin}/jueces/${id}`
  }

  const handleCopyLink = (id) => {
    const url = getJuezUrl(id)
    navigator.clipboard.writeText(url)
    setSnackbarMessage('Link copiado al portapapeles')
    setOpenSnackbar(true)
  }

  const handleOpenLink = (id) => {
    const url = getJuezUrl(id)
    window.open(url, '_blank')
  }

  return (
    <Box sx={{ p: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, textAlign: 'center' }}>
        Panel de Jueces
      </Typography>

      <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 1200, display: 'flex', flexDirection: 'row', alignItems: 'center', height: '80vh' }}>
        {jueces.map((juez) => (
          <Grid item xs={12} md={4} key={juez.id}>
            <Paper
              elevation={3}
              onClick={() => handleOpenLink(juez.id)}
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                border: `3px solid ${juez.color}`,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 20px ${juez.color}40`
                }
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: juez.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: `0 4px 12px ${juez.color}60`
                }}
              >
                <GavelIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>

              <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: juez.color }}>
                {juez.nombre}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mb: 3,
                  color: '#666',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  wordBreak: 'break-all'
                }}
              >
                /jueces/{juez.id}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenLink(juez.id)
                  }}
                  sx={{
                    backgroundColor: juez.color,
                    '&:hover': {
                      backgroundColor: juez.color,
                      filter: 'brightness(0.9)'
                    }
                  }}
                >
                  Abrir
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyLink(juez.id)
                  }}
                  sx={{
                    borderColor: juez.color,
                    color: juez.color,
                    '&:hover': {
                      borderColor: juez.color,
                      backgroundColor: `${juez.color}10`
                    }
                  }}
                >
                  Copiar Link
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
