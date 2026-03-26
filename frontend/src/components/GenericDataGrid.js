'use client'
import { Box } from '@mui/material';
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
  getRowClassName,
}) {
  const { isDark } = useDarkMode()

  const bg = isDark ? '#141414' : 'white'

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <DataGrid
        sx={{
          backgroundColor: bg,
          height: '100%',
          '& .MuiDataGrid-main': { backgroundColor: bg },
          '& .MuiDataGrid-columnHeaders': { backgroundColor: bg },
          '& .MuiDataGrid-columnHeader': { backgroundColor: bg },
          '& .MuiDataGrid-columnHeadersInner': { backgroundColor: bg },
          '& .MuiDataGrid-virtualScroller': { backgroundColor: bg },
          '& .MuiDataGrid-footerContainer': { backgroundColor: bg },
          '& .MuiDataGrid-cell': { fontSize: '0.9rem' },
          '& .MuiDataGrid-columnHeaderTitle': { fontSize: '0.9rem', fontWeight: 700 },
          '& .MuiDataGrid-row': {
            cursor: onRowClick || onCellClick ? 'pointer' : 'default',
          },
          // Colores de fila por tanda
          '& .row-tanda-1': { borderLeft: '3px solid #1976d2' },
          '& .row-tanda-2': { borderLeft: '3px solid #388e3c' },
          '& .row-tanda-3': { borderLeft: '3px solid #F57C00' },
          '& .row-tanda-4': { borderLeft: '3px solid #7b1fa2' },
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
        rows={rows}
        columns={columns}
        disableColumnResize
        disableColumnMenu
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
            pagination: { paginationModel: { page: 0, pageSize: 20 } },
          },
        })}
        pageSizeOptions={[20]}
      />
    </Box>
  );
}
