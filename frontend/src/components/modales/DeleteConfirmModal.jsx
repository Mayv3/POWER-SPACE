'use client'

import {
  Dialog,
  DialogContent,
  Typography,
  Box,
} from '@mui/material'
import { ModalFooterActions } from './ModalFooterActions'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'

export function DeleteConfirmModal({ open, atleta, onClose, onConfirm, loading = false }) {
  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: { sx: modalPaperSx('compact') },
      }}
    >
      <ModalHeader
        title="Eliminar atleta"
        subtitle="Esta acción es permanente."
        tone="error"
        onClose={onClose}
        disabled={loading}
      />

      <DialogContent sx={modalContentSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Revisá los datos antes de confirmar.
        </Typography>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'rgba(211, 47, 47, 0.08)',
            border: '1px solid rgba(211, 47, 47, 0.28)',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="error.main">
            {atleta?.nombre} {atleta?.apellido}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Categoría: {[
              Array.isArray(atleta?.categoria_edad) ? atleta.categoria_edad.join(' / ') : atleta?.categoria_edad,
              atleta?.categoria,
            ].filter(Boolean).join(' · ') || '-'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            DNI: {atleta?.dni || '-'}
          </Typography>
        </Box>
      </DialogContent>

      <ModalFooterActions
        actions={[
          { label: 'Cancelar', tone: 'neutral', onClick: onClose, disabled: loading },
          { label: 'Eliminar', tone: 'error', onClick: onConfirm, loading },
        ]}
      />
    </Dialog>
  )
}
