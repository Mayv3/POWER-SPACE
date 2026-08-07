'use client'

import { useState } from 'react'
import {
  Box, Typography, Paper, Button,
  Snackbar, Alert, Stack, Divider,
} from '@mui/material'
import { ContentCopy as ContentCopyIcon, OpenInNew as OpenInNewIcon, Gavel as GavelIcon } from '@mui/icons-material'
import { useDarkMode } from '../../../context/ThemeContext'

export default function RefereesPage() {
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const { isDark } = useDarkMode()

  const surface = isDark ? '#2a2a2a' : '#ffffff'
  const border  = isDark ? '#3a3a3a' : '#e0e0e0'

  const getRefereeUrl = () => `${window.location.origin}/referee`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getRefereeUrl())
    setOpenSnackbar(true)
  }

  const handleOpenLink = () => window.open(getRefereeUrl(), '_blank')

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>Referees</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Un solo link para los 3 referees. Cada uno lo abre en su dispositivo y elige su rol al entrar.
        </Typography>
      </Box>

      {/* Card */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper
          elevation={0}
          onClick={handleOpenLink}
          sx={{
            width: '100%',
            maxWidth: 460,
            border: `1px solid ${border}`,
            borderRadius: 3,
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            backgroundColor: surface,
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 32px #388e3c30',
              borderColor: '#388e3c',
            },
          }}
        >
          <Box sx={{ height: 6, backgroundColor: '#388e3c' }} />

          <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2 }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: 2,
                backgroundColor: '#388e3c18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <GavelIcon sx={{ fontSize: 28 }} htmlColor="#388e3c" />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  Link de referees
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Principal, lateral izquierdo y lateral derecho
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderColor: border, mb: 2 }} />

            <Box sx={{
              px: 1.5, py: 1, borderRadius: 1.5, mb: 2,
              backgroundColor: isDark ? '#262626' : '#f5f5f5',
              fontFamily: 'monospace', fontSize: '0.8rem',
              color: 'text.secondary', letterSpacing: 0.3,
            }}>
              /referee
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<OpenInNewIcon />}
                onClick={(e) => { e.stopPropagation(); handleOpenLink() }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#388e3c',
                  '&:hover': { backgroundColor: '#388e3c', filter: 'brightness(0.88)' },
                }}
              >
                Abrir
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ContentCopyIcon />}
                onClick={(e) => { e.stopPropagation(); handleCopyLink() }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: border,
                  color: 'text.primary',
                  '&:hover': { borderColor: '#388e3c', color: '#388e3c', backgroundColor: '#388e3c08' },
                }}
              >
                Copiar
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          Link copiado al portapapeles
        </Alert>
      </Snackbar>
    </Box>
  )
}
