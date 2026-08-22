'use client'
import { Box, useMediaQuery } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useDarkMode } from '../context/ThemeContext';

export function GenericDataGrid({
  rows,
  columns,
  paginationMode = 'client',
  rowCount,
  page,
  pageSize,
  onPaginationModelChange,
  loading = false,
  processRowUpdate,
  onProcessRowUpdateError,
  onRowClick,
  onCellClick,
  columnVisibilityModel,
  sortModel,
  onSortModelChange,
  disableColumnSorting = false,
  getRowClassName,
  mobileHorizontal = false,
}) {
  const { isDark } = useDarkMode()
  const isCompactViewport = useMediaQuery('(max-width: 599.95px), (max-height: 599.95px) and (orientation: landscape)')

  const bg = isDark ? '#141414' : 'white'
  const headerBg = isDark ? '#111d18' : '#f5faf7'
  const headerBorder = isDark ? '#244238' : '#d6e7df'
  const visibleColumns = mobileHorizontal && isCompactViewport
    ? columns.map((column) => ({ ...column, minWidth: Math.max(column.minWidth || 0, 88) }))
    : columns

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <DataGrid
        sx={{
          backgroundColor: bg,
          height: '100%',
          border: 0,
          '& .MuiDataGrid-main': { backgroundColor: bg },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: `${headerBg} !important`,
            borderBottom: `1px solid ${headerBorder}`,
          },
          '& .MuiDataGrid-columnHeader': { backgroundColor: `${headerBg} !important` },
          '& .MuiDataGrid-columnHeadersInner': { backgroundColor: `${headerBg} !important` },
          '& .MuiDataGrid-virtualScroller': {
            backgroundColor: bg,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          },
          ...(mobileHorizontal && isCompactViewport && {
            '& .MuiDataGrid-virtualScroller': {
              backgroundColor: bg,
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { display: 'block', height: 6 },
            },
          }),
          '& .MuiDataGrid-footerContainer': { backgroundColor: bg },
          '& .MuiDataGrid-cell': { fontSize: '0.9rem' },
          // Celda de categoría pintada de borde a borde, incluso cuando MUI
          // aplica estados de foco, edición o selección.
          '& .cat-cell': {
            position: 'relative',
            overflow: 'hidden',
            padding: '0 !important',
          },
          '& .cat-cell > div': {
            position: 'absolute',
            inset: 0,
            width: 'auto !important',
            height: 'auto !important',
          },
          // Igual que .cat-cell pero de nombre genérico, para cualquier celda
          // que necesite pintarse de borde a borde (ej: intentos válidos/nulos).
          '& .full-bleed-cell': {
            position: 'relative',
            overflow: 'hidden',
            padding: '0 !important',
          },
          '& .full-bleed-cell > div': {
            position: 'absolute',
            inset: 0,
            width: 'auto !important',
            height: 'auto !important',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            color: '#8aa9a0',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          },
          '& .MuiDataGrid-row': {
            cursor: onRowClick || onCellClick ? 'pointer' : 'default',
          },
          // Colores de fila por tanda
          '& .row-tanda-1': { boxShadow: 'inset 3px 0 #e53935' },
          '& .row-tanda-2': { boxShadow: 'inset 3px 0 #1e88e5' },
          '& .row-tanda-3': { boxShadow: 'inset 3px 0 #43a047' },
          '& .row-tanda-4': { boxShadow: 'inset 3px 0 #fb8c00' },
          '& .row-tanda-5': { boxShadow: 'inset 3px 0 #8e24aa' },
          '& .row-tanda-6': { boxShadow: 'inset 3px 0 #00acc1' },
          '& .row-tanda-7': { boxShadow: 'inset 3px 0 #6d4c41' },
          // Colores para Sentadilla (S1, S2, S3)
          '& .header-sentadilla': {
            backgroundColor: isDark ? '#1a3a5c !important' : '#BBDEFB !important',
            fontWeight: 'bold',
          },
          '& .cell-sentadilla': {
            backgroundColor: isDark ? '#162e47' : '#E3F2FD',
          },
          // Colores para Banco (B1, B2, B3)
          '& .header-banco': {
            backgroundColor: isDark ? '#4a1f1f !important' : '#FFCDD2 !important',
            fontWeight: 'bold',
          },
          '& .cell-banco': {
            backgroundColor: isDark ? '#3b1818' : '#FFEBEE',
          },
          // Colores para Peso Muerto (D1, D2, D3)
          '& .header-peso-muerto': {
            backgroundColor: isDark ? '#1a3d1f !important' : '#C8E6C9 !important',
            fontWeight: 'bold',
          },
          '& .cell-peso-muerto': {
            backgroundColor: isDark ? '#152e19' : '#E8F5E9',
          },
        }}
        checkboxSelection={false}
        hideFooterSelectedRowCount
        rowHeight={36}
        columnHeaderHeight={40}
        rows={rows}
        columns={visibleColumns}
        disableColumnResize
        disableColumnMenu
        disableColumnSorting={disableColumnSorting}
        paginationMode={paginationMode}
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={onProcessRowUpdateError}
        onRowClick={onRowClick}
        onCellClick={onCellClick}
        columnVisibilityModel={columnVisibilityModel}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        getRowClassName={getRowClassName}
        {...(paginationMode === 'server' && {
          rowCount,
          paginationModel: { page: page, pageSize: pageSize },
          onPaginationModelChange,
          loading,
        })}
        {...(paginationMode === 'client' && {
          initialState: {
            sorting: { sortModel: [{ field: 'nombre', sort: 'asc' }] },
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
          },
        })}
        pageSizeOptions={[25]}
      />
    </Box>
  );
}
