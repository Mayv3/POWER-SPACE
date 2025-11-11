import { Box } from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';

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
}) {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <DataGrid
        sx={{
          backgroundColor: 'white',
          height: '100%',
          '& .MuiDataGrid-main': { backgroundColor: 'white' },
          '& .MuiDataGrid-columnHeaders': { backgroundColor: 'white' },
          '& .MuiDataGrid-columnHeader': { backgroundColor: 'white' },
          '& .MuiDataGrid-columnHeadersInner': { backgroundColor: 'white' },
          '& .MuiDataGrid-virtualScroller': { backgroundColor: 'white' },
          '& .MuiDataGrid-footerContainer': { backgroundColor: 'white' },
          '& .MuiDataGrid-row': {
            cursor: onRowClick || onCellClick ? 'pointer' : 'default',
          },
          // Colores para Sentadilla (S1, S2, S3)
          '& .header-sentadilla': {
            backgroundColor: '#BBDEFB !important',
            fontWeight: 'bold',
          },
          '& .cell-sentadilla': {
            backgroundColor: '#E3F2FD',
          },
          // Colores para Banco (B1, B2, B3)
          '& .header-banco': {
            backgroundColor: '#FFCDD2 !important',
            fontWeight: 'bold',
          },
          '& .cell-banco': {
            backgroundColor: '#FFEBEE',
          },
          // Colores para Peso Muerto (D1, D2, D3)
          '& .header-peso-muerto': {
            backgroundColor: '#C8E6C9 !important',
            fontWeight: 'bold',
          },
          '& .cell-peso-muerto': {
            backgroundColor: '#E8F5E9',
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
