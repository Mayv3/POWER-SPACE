'use client'

import {
  Dialog,
  DialogContent,
  Typography,
  Box,
} from '@mui/material'
import { ModalFooterActions } from './ModalFooterActions'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'

export function DeleteGenericModal({
  open,
  title = 'Eliminar',
  nombre,
  descripcion,
  subtitle = 'Esta acción es permanente.',
  confirmLabel = 'Eliminar',
  plainContent = false,
  onClose,
  onConfirm,
  loading = false,
}) {
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
        title={title}
        subtitle={subtitle}
        tone="error"
        onClose={onClose}
        disabled={loading}
      />

      <DialogContent sx={modalContentSx}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ pt: plainContent ? 1 : 0, mb: 2 }}
        >
          Revisá la selección antes de confirmar.
        </Typography>

        <Box
          sx={{
            p: plainContent ? 0 : 2,
            borderRadius: plainContent ? 0 : 2,
            bgcolor: plainContent ? 'transparent' : 'rgba(211, 47, 47, 0.08)',
            border: plainContent ? 0 : '1px solid rgba(211, 47, 47, 0.28)',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="error.main">
            {nombre || '-'}
          </Typography>
          {descripcion && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {descripcion}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <ModalFooterActions
        actions={[
          { label: 'Cancelar', tone: 'neutral', onClick: onClose, disabled: loading },
          { label: confirmLabel, tone: 'error', onClick: onConfirm, loading },
        ]}
      />
    </Dialog>
  )
}
