import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"


import data from "./data.json"

export default function Page() {
  return (
    <>
      <SectionCards
        title="Panoramica Community"
        description="Statistiche e dati principali delle persone e delle attività."
      />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive
          title="Andamento Lavoro e Sanitario"
          description="Visualizza i trend su occupazione, Sanitario e pratiche burocratiche."
        />
      </div>
      <DataTable
        title="Elenco Persone Registrate"
        description="Anagrafica dei membri della comunità con i dettagli principali."
        data={data}
      />
    </>

  );
}
