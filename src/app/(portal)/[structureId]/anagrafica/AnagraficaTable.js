"use client";
import { Input } from "@/components/ui/input"
import { MaterialReactTable } from 'material-react-table'
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { useMemo } from 'react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

const csvConfig = mkConfig({
  fieldSeparator: ',',
  decimalSeparator: '.',
  useKeysAsHeaders: true,
  filename: 'anagrafica_export'
});

// Helper function to format timestamps
const formatTimestamp = (ts, includeTime = false) => {
  if (!ts?._seconds) return '';
  const date = new Date(ts._seconds * 1000);
  return includeTime ? date.toLocaleString('it-IT') : date.toLocaleDateString('it-IT');
};

// Helper function to format array fields
const formatArrayField = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.join('; ');
};

// Transform data for export with proper formatting
const transformDataForExport = (data) => {
  return data.map(row => ({
    nome: row.nome || '',
    cognome: row.cognome || '',
    nome_completo: `${row.nome || ''} ${row.cognome || ''}`.trim(),
    sesso: row.sesso || '',
    dataDiNascita: formatTimestamp(row.dataDiNascita),
    luogoDiNascita: row.luogoDiNascita || '',
    cittadinanza: formatArrayField(row.cittadinanza),
    comuneDiDomicilio: row.comuneDiDomicilio || '',
    telefono: row.telefono || '',
    email: row.email || '',
    nucleo: row.nucleo || '',
    nucleoTipo: row.nucleoTipo || '',
    figli: row.figli || '',
    situazioneLegale: row.situazioneLegale || '',
    situazioneAbitativa: formatArrayField(row.situazioneAbitativa),
    situazioneLavorativa: row.situazioneLavorativa || '',
    titoloDiStudioOrigine: row.titoloDiStudioOrigine || '',
    titoloDiStudioItalia: row.titoloDiStudioItalia || '',
    conoscenzaItaliano: row.conoscenzaItaliano || '',
    vulnerabilita: formatArrayField(row.vulnerabilita),
    intenzioneItalia: row.intenzioneItalia || '',
    paeseDestinazione: row.paeseDestinazione || '',
    referral: row.referral || '',
    createdAt: formatTimestamp(row.createdAt, true),
    updatedAt: formatTimestamp(row.updatedAt, true)
  }));
};

const columnsDef = [
  { accessorKey: 'nome', header: 'Nome (solo)', enableHiding: true },
  { accessorKey: 'cognome', header: 'Cognome', enableHiding: true },
  { 
    accessorFn: (row) => `${row.nome || ''} ${row.cognome || ''}`.trim(), 
    id: 'nome_completo',
    header: 'Nome', 
    size: 150, 
    enableHiding: false 
  },
  { accessorKey: 'sesso', header: 'Sesso', size: 100 },
  {
    accessorKey: 'dataDiNascita',
    header: 'Data di nascita',
    Cell: ({ cell }) => formatTimestamp(cell.getValue()),
    accessorFn: (row) => row.dataDiNascita // Keep original for sorting
  },
  { accessorKey: 'luogoDiNascita', header: 'Luogo di nascita' },
  {
    accessorKey: 'cittadinanza',
    header: 'Cittadinanza',
    Cell: ({ cell }) => {
      const arr = cell.getValue() ?? [];
      if (!Array.isArray(arr) || arr.length === 0) return '';

      const first = arr[0];
      const extraCount = arr.length - 1;
      const renderedCell = extraCount > 0
        ? `${first} (+${extraCount})`  
        : first;
      return (

          <p className='px-1'>{renderedCell}</p>
      );
    },
    accessorFn: (row) => row.cittadinanza // Keep original array for export
  },
  { accessorKey: 'comuneDiDomicilio', header: 'Comune di domicilio' },
  { accessorKey: 'telefono', header: 'Telefono', size: 120 },
  { accessorKey: 'email', header: 'Email', size: 200 },
  { accessorKey: 'nucleo', header: 'Nucleo familiare' },
  { accessorKey: 'nucleoTipo', header: 'Tipo nucleo' },
  { accessorKey: 'figli', header: 'Numero figli' },
  { accessorKey: 'situazioneLegale', header: 'Situazione legale' },
  {
    accessorKey: 'situazioneAbitativa',
    header: 'Situazione abitativa',
    Cell: ({ cell }) => {
      const arr = cell.getValue() ?? [];
      if (!Array.isArray(arr) || arr.length === 0) return '';

      return (
        <span title={arr.join(', ')}>
          {arr[0]} {arr.length > 1 && `(+${arr.length - 1})`}
        </span>
      );
    },
    accessorFn: (row) => row.situazioneAbitativa // Keep original array
  },
  { accessorKey: 'situazioneLavorativa', header: 'Situazione lavorativa' },
  { accessorKey: 'titoloDiStudioOrigine', header: 'Titolo di studio (origine)', enableHiding: true },
  { accessorKey: 'titoloDiStudioItalia', header: 'Titolo di studio (Italia)', enableHiding: true },
  { accessorKey: 'conoscenzaItaliano', header: 'Conoscenza Italiano' },
  {
    accessorKey: 'vulnerabilita',
    header: 'Vulnerabilità',
    size: 180,
    Cell: ({ cell }) => {
      const arr = cell.getValue() ?? [];
      if (!Array.isArray(arr) || arr.length === 0) return '';

      const first = arr[0];
      const extraCount = arr.length - 1;
      const renderedCell = extraCount > 0
        ? `${first} (+${extraCount})`
        : first;
      return (
        <div className='bg-red-200 text-center shadow-gray-800/40 shadow-sm rounded-xs text-red-800'>
          <p className='px-1'>{renderedCell}</p>
        </div>
      );
    },
    accessorFn: (row) => row.vulnerabilita // Keep original array
  },
  { accessorKey: 'intenzioneItalia', header: 'Intenzione rimanere in Italia' },
  { accessorKey: 'paeseDestinazione', header: 'Paese destinazione' },
  { accessorKey: 'referral', header: 'Referral' },
  {
    accessorKey: 'createdAt',
    header: 'Creato il',
    enableHiding: true,
    Cell: ({ cell }) => formatTimestamp(cell.getValue(), true),
    accessorFn: (row) => row.createdAt // Keep original for sorting
  },
  {
    accessorKey: 'updatedAt',
    header: 'Aggiornato il',
    enableHiding: true,
    Cell: ({ cell }) => formatTimestamp(cell.getValue(), true),
    accessorFn: (row) => row.updatedAt // Keep original for sorting
  },
];

export function AnagraficaTable({ rows }) {
  const [globalFilter, setGlobalFilter] = useState('');
  
  const columns = useMemo(() => columnsDef, []);

  const filteredRows = useMemo(() => {
    if (!globalFilter) return rows;
    const searchTerm = globalFilter.toLowerCase();
    return rows.filter((row) => {
      // Search in nome, cognome, and other text fields
      return (
        (row.nome && row.nome.toLowerCase().includes(searchTerm)) ||
        (row.cognome && row.cognome.toLowerCase().includes(searchTerm)) ||
        (row.email && row.email.toLowerCase().includes(searchTerm)) ||
        (row.telefono && row.telefono.toLowerCase().includes(searchTerm)) ||
        (row.comuneDiDomicilio && row.comuneDiDomicilio.toLowerCase().includes(searchTerm))
      );
    });
  }, [rows, globalFilter]);

  const handleExportRows = (tableRows) => {
    // Extract original data from table rows
    const rowData = tableRows.map((row) => row.original);
    // Transform data for export
    const exportData = transformDataForExport(rowData);
    // Generate and download CSV
    const csv = generateCsv(csvConfig)(exportData);
    download(csvConfig)(csv);
  };

  const handleExportData = () => {
    // Transform all filtered data for export
    const exportData = transformDataForExport(filteredRows);
    const csv = generateCsv(csvConfig)(exportData);
    download(csvConfig)(csv);
  };

  return (
    <div className="h-full w-full">
      <Input
        type="text"

        placeholder="Cerca Nome, Cognome, Email, Telefono..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="mb-8 p-1 max-w-lg w-full "
      />
      <MaterialReactTable
        columns={columns}
        data={filteredRows}
        enableColumnFilters
        enableColumnOrdering
        enableGlobalFilter={false} // We're using custom filter
        state={{
          isLoading: !rows,
          showAlertBanner: filteredRows.length === 0,
        }}
        initialState={{
          pagination: { pageSize: 25, pageIndex: 0 },
          density: 'compact',
          columnVisibility: {
            // Hide these columns from view but keep in export
            nome: false,
            cognome: false,
            titoloDiStudioOrigine: false,
            titoloDiStudioItalia: false,
            createdAt: false,
            updatedAt: false,
          },
        }}
        muiTablePaperProps={{
          sx: { borderRadius: 3 }
        }}
        renderTopToolbarCustomActions={({ table }) => (
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Tutto
            </Button>
            <Button
              disabled={table.getPrePaginationRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getPrePaginationRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Tutte le Righe
            </Button>
            <Button
              disabled={table.getRowModel().rows.length === 0}
              onClick={() => handleExportRows(table.getRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Pagina
            </Button>
            <Button
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
              onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              Esporta Selezionate
            </Button>
          </div>
        )}
      />
    </div>
  );
}