'use client'

import { Avatar, Box, Button, CircularProgress, Typography } from '@mui/material'
import { Camera as PhotoCameraIcon } from '@phosphor-icons/react'

export function PhotoUploadField({
  src,
  uploading = false,
  onFile,
  fallbackIcon,
  avatarSx,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 0,
        minHeight: 92,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: '1px dashed',
        borderColor: 'divider',
      }}
    >
      <Avatar src={src || undefined} sx={{ width: 64, height: 64, flex: '0 0 auto', ...avatarSx }}>
        {fallbackIcon}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            minWidth: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Button
            component="label"
            variant="text"
            size="small"
            startIcon={uploading ? <CircularProgress size={15} /> : <PhotoCameraIcon size={18} />}
            disabled={uploading}
            sx={{
              minWidth: 0,
              px: 0.75,
              textTransform: 'none',
              fontWeight: 750,
              whiteSpace: 'nowrap',
            }}
          >
            {uploading ? 'Subiendo...' : (src ? 'Editar foto' : 'Agregar foto')}
            <input hidden type="file" accept="image/*" onChange={onFile} />
          </Button>
        </Box>

        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25, pl: 0.75 }}>
          Opcional
        </Typography>
      </Box>
    </Box>
  )
}
