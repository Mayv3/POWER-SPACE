'use client'

import { Button, CircularProgress, DialogActions } from '@mui/material'

const tones = {
  primary: { backgroundColor: '#F57C00', hoverColor: '#E66F00' },
  success: { backgroundColor: '#2E7D32', hoverColor: '#256829' },
  error: { backgroundColor: '#D32F2F', hoverColor: '#B71C1C' },
  warning: { backgroundColor: '#ED6C02', hoverColor: '#C75700' },
}

export function ModalFooterActions({ actions }) {
  return (
    <DialogActions
      sx={{
        p: 0,
        minHeight: 64,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        '& > :not(style) ~ :not(style)': {
          ml: 0,
        },
      }}
    >
      {actions.map((action, index) => {
        const tone = tones[action.tone || 'primary']
        const isNeutral = action.tone === 'neutral'

        return (
          <Button
            key={action.key || action.label}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            startIcon={!action.loading ? action.icon : undefined}
            disableElevation
            sx={{
              flex: 1,
              alignSelf: 'stretch',
              minWidth: 0,
              minHeight: 64,
              px: 2,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.92rem',
              color: isNeutral ? 'text.primary' : '#fff',
              backgroundColor: isNeutral ? 'transparent' : tone.backgroundColor,
              borderRight: index < actions.length - 1 ? '1px solid' : 0,
              borderColor: 'divider',
              '&:hover': {
                backgroundColor: isNeutral ? 'action.hover' : tone.hoverColor,
              },
              '&.Mui-disabled': {
                color: 'text.disabled',
                backgroundColor: isNeutral ? 'transparent' : 'action.disabledBackground',
                opacity: 1,
              },
              ...action.sx,
            }}
          >
            {action.loading ? <CircularProgress size={21} color="inherit" /> : action.label}
          </Button>
        )
      })}
    </DialogActions>
  )
}
