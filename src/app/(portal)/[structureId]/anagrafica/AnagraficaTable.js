"use client";
import { MaterialReactTable } from 'material-react-table'
import { useMemo } from 'react';
import { useState } from 'react';
const columnsDef = [
  /* { accessorKey: 'cognome', header: 'Cognome', width: 10, maxWidth: 10 }, */
  {  accessorFn: (row) => `${row.nome} ${row.cognome}`, header: 'Nome', width: 10, maxWidth: 10 },
  { accessorKey: 'sesso', header: 'Sesso', width: 10, maxWidth: 10 },
  {
    accessorKey: 'dataDiNascita',
    header: 'Data di nascita',
    Cell: ({ cell }) => {
      const ts = cell.getValue();
      if (!ts?._seconds) return '';
      const date = new Date(ts._seconds * 1000);
      return date.toLocaleDateString('it-IT');
    },
  },
  { accessorKey: 'luogoDiNascita', header: 'Luogo di nascita' },
  {
    accessorKey: 'cittadinanza',
    header: 'Cittadinanza',
    Cell: ({ cell }) => cell.getValue()?.join(', ') ?? '',
  },
  { accessorKey: 'comuneDiDomicilio', header: 'Comune di domicilio' },
  { accessorKey: 'telefono', header: 'Telefono' },
  { accessorKey: 'email', header: 'Email' },
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

      const first = arr[0];
      const extraCount = arr.length - 1;

      return extraCount > 0
        ? `${first} (+${extraCount})`   // 👈 mostra primo valore + numero rimanenti
        : first;
    },
  },
  { accessorKey: 'situazioneLavorativa', header: 'Situazione lavorativa' },
/*   { accessorKey: 'titoloDiStudioOrigine', header: 'Titolo di studio (origine)' },
  { accessorKey: 'titoloDiStudioItalia', header: 'Titolo di studio (Italia)' }, */
  { accessorKey: 'conoscenzaItaliano', header: 'Conoscenza Italiano' },
  {
    accessorKey: 'vulnerabilita',
    header: 'Vulnerabilità',
    size: 180,
    Cell: ({ cell }) => {const arr = cell.getValue() ?? [];
      if (!Array.isArray(arr) || arr.length === 0) return '';

      const first = arr[0];
      const extraCount = arr.length - 1;
      const renderdCell = extraCount > 0
        ? `${first}(+${extraCount})`   // 👈 mostra primo valore + numero rimanenti
        : first;
      return (<div className='bg-red-600 text-center shadow-gray-800/40 shadow-md rounded-xs text-white'>
        <p className='px-1'>

        {" "+renderdCell}
        </p>
      </div>);

    },
  },
  { accessorKey: 'intenzioneItalia', header: 'Intenzione rimanere in Italia' },
  { accessorKey: 'paeseDestinazione', header: 'Paese destinazione' },
  { accessorKey: 'referral', header: 'Referral' },
  /*   {
      accessorKey: 'createdAt',
      header: 'Creato il',
      Cell: ({ cell }) => {
        const ts = cell.getValue();
        if (!ts?._seconds) return '';
        const date = new Date(ts._seconds * 1000);
        return date.toLocaleString('it-IT');
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Aggiornato il',
      Cell: ({ cell }) => {
        const ts = cell.getValue();
        if (!ts?._seconds) return '';
        const date = new Date(ts._seconds * 1000);
        return date.toLocaleString('it-IT');
      },
    }, */
];

export function AnagraficaTable({ rows }) {
  const [cognomeFilter, setCognomeFilter] = useState('');
  const columns = useMemo(() => columnsDef.map((col) =>
    col.accessorKey === 'cognome' 
      ? { ...col, enableColumnFilter: true }
      : { ...col, enableColumnFilter: true }
  ), []);

  const filteredRows = useMemo(() => {
    if (!cognomeFilter) return rows;
    return rows.filter((row) =>
      row.cognome.toLowerCase().includes(cognomeFilter.toLowerCase())
    );
  }, [rows, cognomeFilter]);


  return (
    <div className="h-full w-full">
      <input
        type="text"
        placeholder="Cerca cognome..."
        value={cognomeFilter}
        onChange={(e) => setCognomeFilter(e.target.value)}
        style={{ marginBottom: '8px', padding: '4px 8px', borderRadius: '4px' }}
      />
      <MaterialReactTable
        columns={columns}
        data={filteredRows}
        /* enableRowActions */
        enableColumnFilters
      />
    </div>
  );
}

