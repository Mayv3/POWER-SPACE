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
