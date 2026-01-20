

import { getData } from "./data";
import { AnagraficaTable } from './AnagraficaTable';
import dynamic from 'next/dynamic';

export default async function AnagraficaPage({ params }) {
  const { structureId} = await params;
  const rows = await getData(structureId); // lato server
  const data = JSON.parse(rows);
  return (
  <div className="p-4">

  <AnagraficaTable rows={data} structureId={structureId} />
  </div>
  );
}

