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
}) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: '1400px' }}>
        <DataGrid
          sx={{
            backgroundColor: 'white',
            maxHeight: { xs: '70vh' },
            '& .MuiDataGrid-main': { backgroundColor: 'white' },
            '& .MuiDataGrid-columnHeaders': { backgroundColor: 'white' },
            '& .MuiDataGrid-columnHeader': { backgroundColor: 'white' },
            '& .MuiDataGrid-columnHeadersInner': { backgroundColor: 'white' },
            '& .MuiDataGrid-virtualScroller': { backgroundColor: 'white' },
            '& .MuiDataGrid-footerContainer': { backgroundColor: 'white' },
          }}
          checkboxSelection={false}
          hideFooterSelectedRowCount
          rows={rows}
          columns={columns}
          disableColumnResize
          disableColumnMenu
          paginationMode={paginationMode}
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
    </Box>
  );
}
