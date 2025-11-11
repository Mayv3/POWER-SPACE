'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, Button, Box, Typography, TextField, IconButton, Divider } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import CloseIcon from '@mui/icons-material/Close'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'

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
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: 'grey.500'
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ px: 4, py: 4 }}>
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
              mb: 2,
              boxShadow: `0 4px 12px ${ejercicioColor[ejercicio]}40`
            }}
          >
            <FitnessCenterIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>

          <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
            {ejercicioNombre[ejercicio]}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5 }}>
            {atleta?.apellido} {atleta?.nombre}
          </Typography>

          <Typography 
            variant="body2" 
            sx={{ 
              mb: 3,
              px: 2,
              py: 0.5,
              display: 'inline-block',
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 2,
              fontWeight: 'medium'
            }}
          >
            Intento #{intento}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <TextField
            label="Peso"
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
              mb: 3,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.5rem',
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

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<CheckCircleIcon sx={{ fontSize: 28 }} />}
              onClick={handleValido}
              disabled={!peso || parseFloat(peso) < 0 || parseFloat(peso) > 500}
              sx={{ 
                flex: 1,
                py: 2.5,
                fontWeight: 'bold',
                fontSize: '1.1rem',
                borderRadius: 2,
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s'
                }
              }}
            >
              Válido
            </Button>
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<CancelIcon sx={{ fontSize: 28 }} />}
              onClick={handleNulo}
              disabled={!peso || parseFloat(peso) < 0 || parseFloat(peso) > 500}
              sx={{ 
                flex: 1,
                py: 2.5,
                fontWeight: 'bold',
                fontSize: '1.1rem',
                borderRadius: 2,
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(244, 67, 54, 0.4)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s'
                }
              }}
            >
              Nulo
            </Button>
          </Box>

          <Button
            variant="outlined"
            color="warning"
            size="large"
            fullWidth
            startIcon={<RestartAltIcon sx={{ fontSize: 24 }} />}
            onClick={handleRestablecer}
            sx={{ 
              py: 2,
              fontWeight: 'bold',
              fontSize: '1rem',
              borderRadius: 2,
              textTransform: 'uppercase',
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s'
              }
            }}
          >
            Restablecer
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
