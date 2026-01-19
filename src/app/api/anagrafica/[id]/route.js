import { NextResponse } from "next/server";
import admin from "@/lib/firebase/firebaseAdmin";
import { validateAnagraficaUpdate } from "@/schemas/anagrafica";
import { getUserDocument, arraysIntersect } from "@/utils/database";
import { logger } from "@/utils/logger";

const adminDb = admin.firestore();

/**
 * GET /api/anagrafica/[id]
 * Retrieves a single anagrafica record
 */
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
      logger.warn('Anagrafica not found', { id, userUid });
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    const anagraficaData = { id: anagraficaDoc.id, ...anagraficaDoc.data() };

    // Check soft delete
    if (anagraficaData.deletedAt) {
      logger.warn('Attempted access to deleted anagrafica', { id, userUid });
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    // Get user document using the shared utility
    const userDoc = await getUserDocument(userUid);

    if (!userDoc.exists) {
      logger.warn('User not found', { userUid });
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 403 }
      );
    }

    const userData = userDoc.data;

    // Super admin bypass
    if (userData.role === 'admin') {
      return NextResponse.json(anagraficaData);
    }

    const userStructureIds = userData.structureIds || [];
    const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];

    const hasAccess = arraysIntersect(canBeAccessedBy, userStructureIds);

    if (!hasAccess) {
      logger.warn('Access denied to anagrafica', { userUid, anagraficaId: id });
      return NextResponse.json(
        { error: "Non hai i permessi per visualizzare questa scheda" },
        { status: 403 }
      );
    }

    return NextResponse.json(anagraficaData);

  } catch (error) {
    logger.error('Error fetching anagrafica', error);
    return NextResponse.json(
      { error: "Errore durante il recupero dei dati" },
      { status: 500 }
    );
  }
}


/**
 * PATCH /api/anagrafica/[id]
 * Updates an anagrafica record
 * Uses Zod validation to whitelist allowed fields
 */
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

    // Parse and validate request body
    const rawBody = await request.json();
    const validation = validateAnagraficaUpdate(rawBody);

    if (!validation.success) {
      logger.warn('Invalid anagrafica update data', { userUid, errors: validation.errors });
      return NextResponse.json(
        {
          error: "Dati non validi",
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Use only validated and whitelisted fields
    const validatedData = validation.data;

    const anagraficaRef = adminDb.collection('anagrafica').doc(id);
    const anagraficaDoc = await anagraficaRef.get();

    if (!anagraficaDoc.exists) {
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    const anagraficaData = anagraficaDoc.data();

    // Check soft delete
    if (anagraficaData.deletedAt) {
      return NextResponse.json(
        { error: "Scheda anagrafica non trovata" },
        { status: 404 }
      );
    }

    // Get user document
    const userDoc = await getUserDocument(userUid);

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 403 }
      );
    }

    const userData = userDoc.data;

    // Check access (super admin bypass)
    if (userData.role !== 'admin') {
      const userStructureIds = userData.structureIds || [];
      const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
      const hasAccess = arraysIntersect(canBeAccessedBy, userStructureIds);

      if (!hasAccess) {
        logger.warn('Unauthorized update attempt', { userUid, anagraficaId: id });
        return NextResponse.json(
          { error: "Non hai i permessi per modificare questa scheda" },
          { status: 403 }
        );
      }
    }

    // Update with validated data only (no unsafe spread)
    await anagraficaRef.update({
      ...validatedData,
      updatedAt: new Date().toISOString(),
      updatedBy: userUid,
    });

    logger.info('Anagrafica updated', { anagraficaId: id, userUid });

    const updatedDoc = await anagraficaRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json(updatedData);

  } catch (error) {
    logger.error('Error updating anagrafica', error);
    return NextResponse.json(
      { error: "Errore durante l'aggiornamento" },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/anagrafica/[id]
 * Soft deletes an anagrafica record
 */
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

    // Already deleted
    if (anagraficaData.deletedAt) {
      return NextResponse.json(
        { error: "Scheda già eliminata" },
        { status: 404 }
      );
    }

    // Get user document
    const userDoc = await getUserDocument(userUid);

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 403 }
      );
    }

    const userData = userDoc.data;

    // Check access (super admin bypass)
    if (userData.role !== 'admin') {
      const userStructureIds = userData.structureIds || [];
      const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
      const hasAccess = arraysIntersect(canBeAccessedBy, userStructureIds);

      if (!hasAccess) {
        logger.warn('Unauthorized delete attempt', { userUid, anagraficaId: id });
        return NextResponse.json(
          { error: "Non hai i permessi per eliminare questa scheda" },
          { status: 403 }
        );
      }
    }

    // Soft delete
    await anagraficaRef.update({
      deletedAt: new Date().toISOString(),
      deletedBy: userUid,
      deleted: true,
    });

    logger.info('Anagrafica soft-deleted', { anagraficaId: id, userUid });

    return NextResponse.json({
      success: true,
      message: "Scheda eliminata con successo"
    });

  } catch (error) {
    logger.error('Error deleting anagrafica', error);
    return NextResponse.json(
      { error: "Errore durante l'eliminazione" },
      { status: 500 }
    );
  }
}
