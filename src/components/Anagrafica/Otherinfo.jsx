"use server"
import * as React from "react"
import { ChevronsUpDown, ChevronDown, BriefcaseBusiness, UsersRound, Scale, HandHeart, FileSliders} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import clsx from "clsx"

export default async function Otherinfo({ anagrafica }) {


  return (
    <Accordion

      type="single"
      collapsible
     /*  onOpenChange={setIsOpen} */
      defaultValue="item-1"
      className="flex flex-col gap-2 mt-2 "
    >
      <AccordionItem value="item-1" >
      <AccordionTrigger className="flex items-center justify-between gap-4 px-2">
        <h4 className="text-sm font-semibold">
          Visualizza / Nascondi Altre Informazioni
        </h4>


        {/*     <ChevronDown className={clsx("transition-all duration-300 size-8", { "rotate-180": !isOpen })} />
            <span className="sr-only">Toggle</span>
 */}
        </AccordionTrigger>
      {/* 2. Nucleo Familiare */}
      <AccordionContent className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
             {/*  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span> */}
              <UsersRound className="w-6 h-6" />
              Nucleo Familiare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataRow
              label="Composizione"
              value={anagrafica.nucleo === 'singolo' ? 'Persona singola' : 'Nucleo familiare'}
            />
            {anagrafica.nucleo === 'famiglia' && (
              <>
                <DataRow label="Tipologia nucleo" value={anagrafica.nucleoTipo} />
                <DataRow label="Numero figli minori" value={anagrafica.figli?.toString() || '0'} />
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Situazione Legale e Abitativa */}
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span> */}
              <Scale className="w-6 h-6" />
              Situazione Legale e Abitativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataRow label="Situazione legale" value={anagrafica.situazioneLegale} />
            <DataRow
              label="Situazione abitativa"
              value={anagrafica.situazioneAbitativa?.join(', ') || '-'}
            />
          </CardContent>
        </Card>

        {/* 4. Lavoro e Formazione */}
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
{/*               <span className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </span> */}
              <BriefcaseBusiness className="w-6 h-6" />
              Lavoro e Formazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataRow label="Situazione lavorativa" value={anagrafica.situazioneLavorativa} />
            <DataRow label="Titolo di studio (paese origine)" value={anagrafica.titoloDiStudioOrigine} />
            <DataRow label="Titolo di studio (Italia)" value={anagrafica.titoloDiStudioItalia} />
            <DataRow label="Conoscenza italiano" value={anagrafica.conoscenzaItaliano} />
          </CardContent>
        </Card>

        {/* 5. Vulnerabilità e Prospettive */}
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                5
              </span> */}
              <HandHeart className="w-6 h-6" />
              Vulnerabilità e Prospettive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataRow
              label="Vulnerabilità"
              value={anagrafica.vulnerabilita?.join(', ') || 'Nessuna'}
            />
            <DataRow
              label="Intenzione di fermarsi in Italia"
              value={anagrafica.intenzioneItalia}
            />
            {anagrafica.intenzioneItalia === 'NO' && (
              <DataRow label="Paese di destinazione" value={anagrafica.paeseDestinazione} />
            )}
            <DataRow label="Come ci ha conosciuto" value={anagrafica.referral} />
          </CardContent>
        </Card>

        {/* 6. Referral */}
        {/* <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                6
              </span>
              Referral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataRow label="Come ci ha conosciuto" value={anagrafica.referral} />
          </CardContent>
        </Card> */}
        <div className="lg:col-span-2 gap-2  border-2 rounded-md bg-gray-100 pt-4 pb-2 ">
          <CardHeader className="">
            <CardTitle className="text-sm items-center flex gap-2">
              <FileSliders className="w-4 h-4" />
              Informazioni di Registrazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 flex text-sm space-x-4 text-gray-600">
            <DataRow
              label="Registrato da"
              value={anagrafica.registeredBy}
              small
            />
            <DataRow
              label="Struttura"
              value={anagrafica.registeredByStructure}
              small
            />
            <DataRow
              label="Data registrazione"
              value={anagrafica.createdAt ? formatTimestamp(anagrafica.createdAt, true) : '-'}
              small
            />
              <DataRow
              label="Ultimo aggiornamento"
              value={anagrafica.updatedAt ? formatTimestamp(anagrafica.updatedAt, true) : '-'}
              small
            />
          </CardContent>
        </div>
      </AccordionContent>
      </AccordionItem >
    </Accordion>
  )
}

function DataRow({ label, value, small = false }) {
  const textSize = small ? 'text-sm' : 'text-base';
  
  return (
    <div className={`flex flex-col ${textSize}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-2">{label}</span>
      <span className="text-gray-900  font-medium ">{value || '-'}</span>
    </div>
  );
}

const formatTimestamp = (ts, includeTime = false) => {
  if (!ts?._seconds) return '';
  const date = new Date(ts._seconds * 1000);
  return includeTime ? date.toLocaleString('it-IT') : date.toLocaleDateString('it-IT');
};