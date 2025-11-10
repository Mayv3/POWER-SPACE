'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
} from '@mui/material'

export function GenericModal({ open, title, children, onClose, onSave, loading = false }) {
  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: { sx: { borderRadius: 2, p: 1.5} },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {children}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={onSave} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            backgroundColor: '#F57C00',
            '&:hover': {
              backgroundColor: '#FF9800'
            }
          }}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
