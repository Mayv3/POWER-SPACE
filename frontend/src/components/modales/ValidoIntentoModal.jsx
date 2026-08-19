'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, Box, Typography, TextField } from '@mui/material'
import { CheckCircle as CheckCircleIcon, XCircle as CancelIcon, ArrowsClockwise as RestartAltIcon, Barbell as FitnessCenterIcon } from '@phosphor-icons/react'
import { ModalFooterActions } from './ModalFooterActions'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'

export function ValidoIntentoModal({ open, onClose, onConfirm, atleta, ejercicio, intento, pesoActual, field }) {
  const [peso, setPeso] = useState('')

  useEffect(() => {
    if (open && pesoActual) {
      setPeso(pesoActual.toString())
    } else if (open) {
      setPeso('')
    }
  }, [open, pesoActual])

  const handleValido = () => {
    const pesoNumerico = parseFloat(peso)
    if (isNaN(pesoNumerico) || pesoNumerico < 0 || pesoNumerico > 500) return
    onConfirm(true, pesoNumerico)
    onClose()
  }

  const handleNulo = () => {
    const pesoNumerico = parseFloat(peso)
    if (isNaN(pesoNumerico) || pesoNumerico < 0 || pesoNumerico > 500) return
    onConfirm(false, pesoNumerico)
    onClose()
  }

  const handleRestablecer = () => {
    onConfirm(null, null)
    onClose()
  }

  const ejercicioNombre = {
    sentadilla: 'Sentadilla',
    banco: 'Banco',
    peso_muerto: 'Peso Muerto'
  }

  const ejercicioColor = {
    sentadilla: '#3f51b5',
    banco: '#f50057',
    peso_muerto: '#ff9800'
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={false}
      fullWidth
      slotProps={{ paper: { sx: modalPaperSx('standard') } }}
    >
      <ModalHeader
        title={`${ejercicioNombre[ejercicio]} · Intento ${intento}`}
        subtitle={`${atleta?.apellido || ''} ${atleta?.nombre || ''}`.trim()}
        onClose={onClose}
      />
      <DialogContent sx={modalContentSx}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
          <Box 
            sx={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: ejercicioColor[ejercicio] || '#3f51b5',
              mb: 1.5,
              boxShadow: `0 4px 12px ${ejercicioColor[ejercicio]}40`
            }}
          >
            <FitnessCenterIcon size={32} color="white" />
          </Box>

          </Box>
          <Box>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Peso del intento
          </Typography>
          <TextField
            aria-label="Peso del intento"
            type="number"
            value={peso}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 500 && !isNaN(parseFloat(value)))) {
                setPeso(value)
              }
            }}
            fullWidth
            variant="outlined"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                fontSize: '1.65rem',
                fontWeight: 'bold'
              }
            }}
            InputProps={{
              endAdornment: <Typography sx={{ color: 'text.secondary', fontWeight: 'medium' }}>kg</Typography>
            }}
            inputProps={{ 
              step: 0.5,
              min: 0,
              max: 500,
              style: { textAlign: 'center' }
            }}
            autoFocus
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Podés usar incrementos de 0,5 kg.
          </Typography>
          </Box>
        </Box>
      </DialogContent>
      <ModalFooterActions
        actions={[
          {
            label: 'Restablecer',
            tone: 'warning',
            icon: <RestartAltIcon size={21} />,
            onClick: handleRestablecer,
          },
          {
            label: 'Nulo',
            tone: 'error',
            icon: <CancelIcon size={21} />,
            onClick: handleNulo,
            disabled: !peso || parseFloat(peso) < 0 || parseFloat(peso) > 500,
          },
          {
            label: 'Válido',
            tone: 'success',
            icon: <CheckCircleIcon size={21} />,
            onClick: handleValido,
            disabled: !peso || parseFloat(peso) < 0 || parseFloat(peso) > 500,
          },
        ]}
      />
    </Dialog>
  )
}
