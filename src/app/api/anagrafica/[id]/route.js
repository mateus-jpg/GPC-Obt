
import { NextResponse } from "next/server";
import admin  from "@/lib/firebase/firebaseAdmin"; 

const adminDb = admin.firestore();
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const userUid = request.headers.get('x-user-uid');
    
    if (!userUid) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
    }

    
    const anagraficaRef = adminDb.collection('anagrafica').doc(id);
    const anagraficaDoc = await anagraficaRef.get();

    if (!anagraficaDoc.exists) {
      console.error('Anagrafica not found for id:', id);
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    const anagraficaData = { id: anagraficaDoc.id, ...anagraficaDoc.data() };

    
    const userRef = adminDb.collection('operators').doc(userUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error('User not found for uid:', userUid);
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 403 }
      );
    }

    const userData = userDoc.data();
    const userStructureIds = userData.structureIds || [];

    
    const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
    const hasAccess = canBeAccessedBy.some(structureId => 
      userStructureIds.includes(structureId)
    );

    if (!hasAccess) {
      console.error('Access denied for user uid:', userUid, 'on anagrafica id:', id);
      return NextResponse.json(
        { error: "Non hai i permessi per visualizzare questa scheda" },
        { status: 403 }
      );
    }

    
    return NextResponse.json(anagraficaData);

  } catch (error) {
    console.error('Error fetching anagrafica:', error);
    return NextResponse.json(
      { error: "Errore durante il recupero dei dati" },
      { status: 500 }
    );
  }
}


export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const userUid = request.headers.get('x-user-uid');
    
    if (!userUid) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
    }

    const body = await request.json();

    
    const anagraficaRef = adminDb.collection('anagrafica').doc(id);
    const anagraficaDoc = await anagraficaRef.get();

    if (!anagraficaDoc.exists) {
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    const anagraficaData = anagraficaDoc.data();

    
    const userRef = adminDb.collection('users').doc(userUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 403 }
      );
    }

    const userData = userDoc.data();
    const userStructureIds = userData.structureIds || [];

    
    const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
    const hasAccess = canBeAccessedBy.some(structureId => 
      userStructureIds.includes(structureId)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Non hai i permessi per modificare questa scheda" },
        { status: 403 }
      );
    }

    
    await anagraficaRef.update({
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: userUid,
    });

    
    const updatedDoc = await anagraficaRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json(updatedData);

  } catch (error) {
    console.error('Error updating anagrafica:', error);
    return NextResponse.json(
      { error: "Errore durante l'aggiornamento" },
      { status: 500 }
    );
  }
}


export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const userUid = request.headers.get('x-user-uid');
    
    if (!userUid) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      );
    }

    
    const anagraficaRef = adminDb.collection('anagrafica').doc(id);
    const anagraficaDoc = await anagraficaRef.get();

    if (!anagraficaDoc.exists) {
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    const anagraficaData = anagraficaDoc.data();

    
    const userRef = adminDb.collection('users').doc(userUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 403 }
      );
    }

    const userData = userDoc.data();
    const userStructureIds = userData.structureIds || [];

    
    const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
    const hasAccess = canBeAccessedBy.some(structureId => 
      userStructureIds.includes(structureId)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Non hai i permessi per eliminare questa scheda" },
        { status: 403 }
      );
    }

    
    await anagraficaRef.update({
      deletedAt: new Date().toISOString(),
      deletedBy: userUid,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Scheda eliminata con successo" 
    });

  } catch (error) {
    console.error('Error deleting anagrafica:', error);
    return NextResponse.json(
      { error: "Errore durante l'eliminazione" },
      { status: 500 }
    );
  }
}