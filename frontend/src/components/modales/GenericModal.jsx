'use client'

import {
  Dialog,
  DialogContent,
  Box,
} from '@mui/material'
import { ModalFooterActions } from './ModalFooterActions'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'

export function GenericModal({
  open,
  title,
  subtitle,
  children,
  onClose,
  onSave,
  loading = false,
  size = 'standard',
  saveLabel = 'Guardar',
  saveDisabled = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: { sx: modalPaperSx(size) },
      }}
    >
      <ModalHeader
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        disabled={loading}
      />
      <DialogContent dividers sx={modalContentSx}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </DialogContent>
      <ModalFooterActions
        actions={[
          { label: 'Cancelar', tone: 'neutral', onClick: onClose, disabled: loading },
          { label: saveLabel, onClick: onSave, loading, disabled: saveDisabled },
        ]}
      />
    </Dialog>
  )
}
