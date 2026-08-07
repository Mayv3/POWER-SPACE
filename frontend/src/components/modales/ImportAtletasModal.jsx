'use client'

import { useRef, useState } from 'react'
import {
  Dialog, DialogContent, Box, Typography, Button, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Alert,
} from '@mui/material'
import { UploadSimple as UploadIcon, DownloadSimple as DownloadIcon } from '@phosphor-icons/react'
import { ModalHeader, modalContentSx, modalPaperSx } from './ModalLayout'
import { ModalFooterActions } from './ModalFooterActions'
import { apiFetch } from '../../lib/api'
import { descargarPlantillaAtletas, parseArchivoAtletas, mapearFilaAtleta } from '../../lib/atletasImport'

export function ImportAtletasModal({ open, onClose, onImported }) {
  const inputRef = useRef(null)
  const [parsing, setParsing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filas, setFilas] = useState([]) // [{ atleta, errores }]
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 })
  const [resultados, setResultados] = useState(null) // [{ ok, mensaje }] por fila válida, alineado a validas

  const validas = filas.filter((f) => f.errores.length === 0)
  const invalidas = filas.filter((f) => f.errores.length > 0)

  const reset = () => {
    setFilas([])
    setResultados(null)
    setProgreso({ hechos: 0, total: 0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    if (importando) return
    reset()
    onClose()
  }

  const procesarArchivo = async (file) => {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      alert('El archivo debe ser .xlsx o .xls')
      return
    }
    setParsing(true)
    setResultados(null)
    setProgreso({ hechos: 0, total: 0 })
    try {
      const rawRows = await parseArchivoAtletas(file)
      const mapeadas = rawRows.map((row) => mapearFilaAtleta(row))
      setFilas(mapeadas)
    } catch (err) {
      console.error('Error al leer el Excel:', err)
      alert('No se pudo leer el archivo. Verificá que sea el formato de la plantilla.')
    } finally {
      setParsing(false)
    }
  }

  const handleFile = (event) => procesarArchivo(event.target.files?.[0])

  const handleDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    if (importando) return
    procesarArchivo(event.dataTransfer.files?.[0])
  }

  const handleImportar = async () => {
    if (importando || validas.length === 0) return
    setImportando(true)
    setProgreso({ hechos: 0, total: validas.length })
    const res = []
    for (const { atleta } of validas) {
      try {
        const r = await apiFetch('/api/atletas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(atleta),
        })
        await r.json()
        res.push({ ok: true, mensaje: 'Creado' })
      } catch (err) {
        res.push({ ok: false, mensaje: err.message || 'Error al crear' })
      }
      setProgreso((p) => ({ ...p, hechos: p.hechos + 1 }))
    }
    setResultados(res)
    setImportando(false)
    await onImported?.()
  }

  const exitosos = resultados ? resultados.filter((r) => r.ok).length : 0
  const fallidos = resultados ? resultados.filter((r) => !r.ok).length : 0

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      slotProps={{ paper: { sx: modalPaperSx('wide') } }}
    >
      <ModalHeader
        title="Importar atletas desde Excel"
        subtitle="Descargá la plantilla, completala y subila para crear varios atletas de una."
        onClose={handleClose}
        disabled={importando}
      />
      <DialogContent dividers sx={modalContentSx}>
        <Stack spacing={2.5}>
          <Alert severity="info" variant="outlined">
            Categoría de edad, categoría de peso, división y tanda se calculan/asignan automáticamente
            (podés ajustarlas después desde la ficha de cada atleta).
          </Alert>

          <Box
            onDragOver={(e) => { e.preventDefault(); if (!importando) setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !importando && inputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? '#F57C00' : 'divider',
              borderRadius: 2,
              bgcolor: dragOver ? 'rgba(245,124,0,.08)' : 'transparent',
              transition: 'border-color .15s, background-color .15s',
              cursor: importando ? 'default' : 'pointer',
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 3, sm: 4 },
            }}
          >
            <UploadIcon size={40} color={dragOver ? '#F57C00' : 'var(--mui-palette-text-secondary, #888)'} style={{ marginBottom: 12 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="center">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon size={18} />}
                onClick={(e) => { e.stopPropagation(); descargarPlantillaAtletas() }}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Descargar plantilla
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadIcon size={18} />}
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                disabled={parsing || importando}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#F57C00', '&:hover': { bgcolor: '#e56f00' } }}
              >
                {parsing ? 'Leyendo...' : 'Elegir archivo'}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleFile}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
              {dragOver ? 'Soltá el archivo acá' : 'o arrastrá el archivo .xlsx acá'}
            </Typography>
          </Box>

          {filas.length > 0 && (
            <>
              <Stack direction="row" spacing={1}>
                <Chip size="small" color="success" label={`${validas.length} listos`} />
                {invalidas.length > 0 && (
                  <Chip size="small" color="error" label={`${invalidas.length} con error`} />
                )}
              </Stack>

              <TableContainer sx={{ maxHeight: 360, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>DNI</TableCell>
                      <TableCell>Fecha nac.</TableCell>
                      <TableCell>Sexo</TableCell>
                      <TableCell>Peso</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Sent.</TableCell>
                      <TableCell>Banco</TableCell>
                      <TableCell>P. Muerto</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filas.map(({ atleta, errores }, i) => {
                      const resultado = resultados?.[validas.indexOf(filas[i])]
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{atleta.nombre} {atleta.apellido}</TableCell>
                          <TableCell>{atleta.dni}</TableCell>
                          <TableCell>{atleta.fecha_nacimiento || '—'}</TableCell>
                          <TableCell>{atleta.sexo || '—'}</TableCell>
                          <TableCell>{atleta.peso_corporal ?? '—'}</TableCell>
                          <TableCell>{atleta.categoria || '—'}</TableCell>
                          <TableCell>{atleta.primer_intento_sentadilla ?? '—'}</TableCell>
                          <TableCell>{atleta.primer_intento_banco ?? '—'}</TableCell>
                          <TableCell>{atleta.primer_intento_peso_muerto ?? '—'}</TableCell>
                          <TableCell>
                            {errores.length > 0 ? (
                              <Typography variant="caption" color="error.main">
                                {errores.join(' · ')}
                              </Typography>
                            ) : resultado ? (
                              <Typography variant="caption" color={resultado.ok ? 'success.main' : 'error.main'}>
                                {resultado.ok ? 'Importado' : resultado.mensaje}
                              </Typography>
                            ) : (
                              <Chip size="small" label="Listo" color="success" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {importando && (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Importando {progreso.hechos} / {progreso.total}
                  </Typography>
                </Box>
              )}

              {resultados && (
                <Alert severity={fallidos === 0 ? 'success' : 'warning'}>
                  {exitosos} atleta{exitosos === 1 ? '' : 's'} importado{exitosos === 1 ? '' : 's'} correctamente
                  {fallidos > 0 && `, ${fallidos} fallaron (ver detalle en la tabla)`}.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <ModalFooterActions
        actions={[
          { label: 'Cerrar', tone: 'neutral', onClick: handleClose, disabled: importando },
          {
            label: importando ? 'Importando...' : `Importar ${validas.length || ''} atleta${validas.length === 1 ? '' : 's'}`,
            onClick: handleImportar,
            loading: importando,
            disabled: validas.length === 0 || importando || !!resultados,
          },
        ]}
      />
    </Dialog>
  )
}
