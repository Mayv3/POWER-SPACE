'use client'

import { Box, DialogTitle, IconButton, Typography } from '@mui/material'
import { X as CloseIcon } from '@phosphor-icons/react'

const modalWidths = {
  compact: 480,
  standard: 760,
  wide: 1120,
}

export const modalPaperSx = (size = 'standard') => ({
  width: {
    xs: 'calc(100% - 24px)',
    sm: `min(${modalWidths[size] || modalWidths.standard}px, calc(100% - 40px))`,
  },
  maxWidth: 'none',
  maxHeight: { xs: 'calc(100dvh - 24px)', sm: 'calc(100dvh - 48px)' },
  m: { xs: 1.5, sm: 3 },
  borderRadius: { xs: 2.5, sm: 3 },
  overflow: 'hidden',
  backgroundImage: 'none',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.42)',
})

export const modalContentSx = {
  px: { xs: 2, sm: 3 },
  py: { xs: 2, sm: 2.5 },
  bgcolor: 'background.paper',
  '&.MuiDialogContent-dividers': {
    borderColor: 'divider',
  },
}

export function ModalHeader({ title, subtitle, onClose, disabled = false, tone = 'primary' }) {
  const accent = tone === 'error' ? 'error.main' : '#F57C00'

  return (
    <DialogTitle
      component="div"
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minHeight: 76,
        px: { xs: 2, sm: 3 },
        py: 2,
        pr: onClose ? { xs: 7, sm: 8 } : { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&::before': {
          content: '""',
          width: 4,
          height: 34,
          flex: '0 0 auto',
          borderRadius: 99,
          bgcolor: accent,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h6"
          component="h2"
          sx={{
            display: 'block',
            color: 'text.primary',
            fontWeight: 850,
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {onClose && (
        <IconButton
          aria-label="Cerrar"
          onClick={onClose}
          disabled={disabled}
          size="small"
          sx={{
            position: 'absolute',
            right: { xs: 16, sm: 22 },
            top: '50%',
            transform: 'translateY(-50%)',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <CloseIcon size={20} />
        </IconButton>
      )}
    </DialogTitle>
  )
}

export function ModalSection({ title, description, children, sx }) {
  return (
    <Box
      component="section"
      sx={{
        minWidth: 0,
        py: { xs: 2.25, sm: 2.75 },
        px: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        '&:first-of-type': {
          pt: 0,
          borderTop: 0,
        },
        ...sx,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="overline"
          component="h3"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            m: 0,
            width: 'fit-content',
            px: 0,
            pt: 0,
            pb: 0.4,
            borderBottom: '3px solid #F57C00',
            color: 'text.primary',
            fontWeight: 900,
            letterSpacing: '0.08em',
            lineHeight: 1.4,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, pl: 1.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  )
}
