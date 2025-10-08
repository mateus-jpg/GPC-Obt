"use server"
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, PlusCircleIcon, UserRound } from "lucide-react";
import Otherinfo from "@/components/Anagrafica/Otherinfo";
import admin from "@/lib/firebase/firebaseAdmin";

import { Status, StatusIndicator, StatusLabel } from '@/components/ui/shadcn-io/status';
import { Button } from "@/components/ui/button";
import AccessDialog from "@/components/Anagrafica/AccessDialog/AccessDialog";

async function getAnagraficaData(id) {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') || 'http';

  try {
    const res = await fetch(`${protocol}://${host}/api/anagrafica/${id}`, {
      headers: {
        cookie: headersList.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching anagrafica:', error);
    return null;
  }
}

async function canUserAccess(anagrafica, userID) {
  const db = admin.firestore();
  const userRef = db.collection('operators').doc(userID);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  const userStructureIds = userData?.structureIds || [];
  if (!anagrafica?.canBeAccessedBy || !userStructureIds) {
    return false;
  }

  return anagrafica.canBeAccessedBy.some(id =>
    userStructureIds.includes(id)
  );
}

export default async function AnagraficaViewPage({ params }) {
  const { id, structureId } = await params;
  const headersList = await headers();

  // Get user info from middleware
  const userUid = headersList.get('x-user-uid');

  if (!userUid) {
    return notFound();
  }


  const anagrafica = await getAnagraficaData(id);

  if (!anagrafica) {
    return notFound();
  }


  const userStructureIds = [structureId]; // Should come from user's profile

  if (!await canUserAccess(anagrafica, userUid)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Accesso Negato
            </h2>
            <p className="text-gray-600">
              Non hai i permessi per visualizzare questa scheda anagrafica.
            </p>
          </CardContent>
        </Card>
      </div>  
    );
  }

  return (

    <div className="w-full mx-auto px-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-2">
          <div className="capitalize flex gap-6" >
            <h1 className="text-3xl font-bold flex items-center align-middle gap-2  text-gray-900">
              {/*  <IconUser className="w-6 h-6" />  */}{anagrafica.nome} {anagrafica.cognome}
            </h1>
            {anagrafica.vulnerabilita?.length > 0 && (
            <Status status="offline">
              <StatusIndicator className="w-3 h-3" />
              <h3 className="text-sm font-medium text-red-600">Presenti vulnerabilita</h3>
            </Status>)}

            {/*   <p className="text-gray-600 mt-1">
                Scheda Anagrafica - ID: {id}
              </p> */}
          </div>
          <Badge variant="outline" className="text-sm">
            Visualizzazione Autorizzata
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Informazioni Anagrafiche */}
        <Card className="lg:col-span-2 gap-2  ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span> */}
              <UserRound className="w-5 h-5" />
              Informazioni Generali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-4">
            <DataRow label="Nome" value={anagrafica.nome} />
            <DataRow label="Cognome" value={anagrafica.cognome} />
            <DataRow label="Sesso" value={anagrafica.sesso} />
            <DataRow
              label="Data di nascita"
              value={anagrafica.dataDiNascita ? formatTimestamp(anagrafica.dataDiNascita) : '-'}
            />
            <DataRow label="Luogo di nascita" value={anagrafica.luogoDiNascita} />
            <DataRow
              label="Cittadinanza"
              value={anagrafica.cittadinanza?.join(', ') || '-'}
            />
            <DataRow label="Comune di domicilio" value={anagrafica.comuneDiDomicilio} />

            <DataRow label="Telefono" value={anagrafica.telefono} />
            <DataRow label="Email" value={anagrafica.email} />
          </CardContent>
        </Card>


      </div>
      <div className="flex justify-between items-center mt-4">

      <Button variant="outline" asChild className="">
        <Link href={`/${structureId}/anagrafica`}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla lista
        </Link>
      </Button>
      <AccessDialog/>
      </div>
      <Otherinfo anagrafica={anagrafica} />
      {/* Metadata */}

    </div>

  );
}

// Helper component for displaying data rows


const formatTimestamp = (ts, includeTime = false) => {
  if (!ts?._seconds) return '';
  const date = new Date(ts._seconds * 1000);
  return includeTime ? date.toLocaleString('it-IT') : date.toLocaleDateString('it-IT');
};

function DataRow({ label, value, small = false }) {
  const textSize = small ? 'text-sm' : 'text-base';

  return (
    <div className={`flex flex-col ${textSize}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-2">{label}</span>
      <span className="text-gray-900 font-medium ">{value || '-'}</span>
    </div>
  );
}