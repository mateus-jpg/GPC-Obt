"use client";

import React, { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialReactTable } from "material-react-table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FileIcon } from "lucide-react";

export default function EventInfo({ events }) {
  if (!events) return null;

  // Remove the async/await - accesses is already resolved data
  const [data, setData] = React.useState([]);

  React.useEffect(() => {
    // Just set the data directly
    const incomingEvents = events.filter(event => event.dataOra > new Date().toISOString());

    setData(
      (incomingEvents || []).map((event) => {
        const eventDate = new Date(event.dataOra); // convert ISO string to Date
        const now = new Date();
        const diffInDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

        return {
          ...event,
          daysLeft: diffInDays,
        };
      })
    );
    debugger
    console.log("Events received:", events);
  }, [events]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "daysLeft",
        header: "Giorni rimanenti",
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (value == null || value === "-") return "-";
          let className = "";
          let variant = "outline";
          if (value <= 7) variant = "destructive";
          else if (value <= 15) {
            variant = "secondary";
            className = "bg-orange-500 text-white";
          }
          else if (value <= 30) {
            variant = "green";
            className = "bg-green-500 text-white";
          }

          return (
            <Badge variant={variant} className={"px-2 py-1 text-xs font-medium " + className}>
              {value <= 0 ? "Scaduto" : `${value} giorni`}
            </Badge>
          );
        },
      },
      {
        accessorKey: "dataOra",
        header: "Data e ora",
        size: 200,
        Cell: ({ cell }) => formatDate(cell.getValue(), true) || "-",
      },
      {
        accessorKey: "tipoEvento",
        header: "Tipo Evento",
        size: 160,
        Cell: ({ cell }) => cell.getValue() || "-",
      },
      {
        accessorKey: "sottoCategorie",
        header: "Sottocategorie",
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return Array.isArray(value) ? value.join(", ") : "-";
        },
        size: 200,
      },
      /* {
        accessorKey: "classificazione",
        header: "Classificazione",
        size: 150,
        Cell: ({ cell }) => cell.getValue() || "-",
      },
      {
        accessorKey: "enteRiferimento",
        header: "Ente di riferimento",
        size: 180,
        Cell: ({ cell }) => cell.getValue() || "-",
      }, */
      {
        accessorKey: "sanitizedNote",
        header: "Note",
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value || "-";
        },
        size: 250,
      },
      {
        accessorKey: "files",
        header: "File",
        Cell: ({ cell }) => {
          const files = cell.getValue() || [];
          if (!Array.isArray(files) || files.length === 0) return "-";
          return (
            <div className="flex flex-col gap-1">
              {files.map((f, i) => (
                <Link
                  key={i}
                  href={`https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${f.path}`}
                  target="_blank"
                  className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                >
                  <FileIcon className="w-4 h-4" />
                  {f.nome.length > 15 ? f.nome.slice(0, 15) + "..." : f.nome}
                </Link>
              ))}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: "createdAt",
        header: "Data",
        Cell: ({ cell }) => formatDate(cell.getValue()),
        size: 150,
      },
      {
        accessorKey: "createdByEmail",
        header: "Operatore",
        Cell: ({ cell, row }) => cell.getValue() || row.original.createdBy || "-",
        size: 200,
      },
    ],
    []
  );

  return (
    <Accordion type="single" collapsible defaultValue="item-1" className="flex flex-col gap-2 mt-2">
      <AccordionItem value="item-1">
        <AccordionTrigger className="flex items-center justify-between gap-4 px-2">
          <h4 className="text-sm font-semibold">Visualizza / Nascondi Accessi</h4>
        </AccordionTrigger>
        <AccordionContent>
          {!data || data.length === 0 ? (
            <p className="text-gray-500 text-sm px-2">
              Nessun accesso registrato per questa anagrafica.
            </p>
          ) : (
            <MaterialReactTable
              muiTablePaperProps={{
                sx: { borderRadius: 3, border: '1px solid var(--color-gray-200)', elevation : 3 },
              }}
              columns={columns}
              data={data}
              enableDensityToggle={false}
              enableColumnActions={false}
              initialState={{
                sorting: [{ id: "createdAt", desc: true }],
              }}
              muiTableBodyCellProps={{ sx: { fontSize: "0.875rem" } }}
              muiTableHeadCellProps={{ sx: { fontWeight: "bold" } }}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("it-IT");
}