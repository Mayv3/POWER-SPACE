'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  CircularProgress,
} from '@mui/material'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'

export function DeleteConfirmModal({ open, atleta, onClose, onConfirm, loading = false }) {
  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#fff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          },
        },
      }}
    >
      <Box sx={{ bgcolor: 'error.main', color: '#fff', py: 2, px: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <WarningAmberRoundedIcon />
          <Typography variant="h6" fontWeight={700}>
            Eliminar atleta
          </Typography>
        </Stack>
      </Box>

      <DialogContent sx={{ py: 3, px: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          ¿Seguro que querés eliminar al siguiente atleta? Esta acción no se puede deshacer.
        </Typography>

        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: 'rgba(255, 0, 0, 0.06)',
            border: '1px dashed rgba(255, 0, 0, 0.3)',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="error.main">
            {atleta?.nombre} {atleta?.apellido}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Categoría: {atleta?.categoria || '-'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            DNI: {atleta?.dni || '-'}
          </Typography>
        </Box>
      </DialogContent>


      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={loading}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Cancelar
        </Button>

        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          {loading ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
