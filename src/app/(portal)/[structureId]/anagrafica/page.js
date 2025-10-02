

import { getData } from "./data";
import { AnagraficaTable } from './AnagraficaTable';
import dynamic from 'next/dynamic';
// Server Component wrapper
export default async function AnagraficaPage({ params }) {
  const { structureId} = await params;
  const rows = await getData(structureId); // lato server
  const data = JSON.parse(rows);
  return (<div className="p-4">

  <AnagraficaTable rows={data} />
  </div>
  );
}

