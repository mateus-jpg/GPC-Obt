// app/api/anagrafica/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase/firebaseAdmin"; // Admin SDK inizializzato
import { z } from "zod";


const db = admin.firestore();
const auth = admin.auth();

// Schema di validazione lato server
const AnagraficaSchema = z.object({
  cognome: z.string().min(1),
  nome: z.string().min(1),
  sesso: z.string(),
  dataDiNascita: z.date().optional(),
  luogoDiNascita: z.string().optional(),
  cittadinanza: z.array(z.string()).min(1),
  comuneDiDomicilio: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
  nucleo: z.enum(["singolo", "famiglia"]),
  nucleoTipo: z.string().optional(),
  figli: z.number().int().nonnegative(),
  situazioneLegale: z.string().optional(),
  situazioneAbitativa: z.array(z.string()).optional(),
  situazioneLavorativa: z.string().optional(),
  titoloDiStudioOrigine: z.string().optional(),
  titoloDiStudioItalia: z.string().optional(),
  conoscenzaItaliano: z.string().optional(),
  vulnerabilita: z.array(z.string()).optional(),
  intenzioneItalia: z.string().optional(),
  paeseDestinazione: z.string().optional(),
  referral: z.string().optional(),
  referralAltro: z.string().optional(),
  canBeAccessedBy: z.array(z.string()).optional(),
  registeredByStructure: z.string().min(1),
});

export async function POST(req) {
  try {
    // 1️⃣ Verifica session cookie
    const sessionCookie = req.cookies.get(process.env.SESSION_COOKIE_NAME || "session")?.value;
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    const operatorDoc = await db.collection("operators").doc(uid).get();
    if (!operatorDoc.exists) return NextResponse.json({ error: "Operatore non trovato" }, { status: 403 });

    const operatorData = operatorDoc.data();
    const operatorStructures = operatorData?.structureIds || [];
    if (operatorStructures.length === 0) return NextResponse.json({ error: "Operatore senza strutture assegnate" }, { status: 403 });

    // 2️⃣ Leggi e valida il body
    const body = await req.json();
    if (body.dataDiNascita) {
      body.dataDiNascita = new Date(body.dataDiNascita);
    }
    console.log("Received body:", body); // Log del body ricevuto
    const parsed = AnagraficaSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.errors); // Log degli errori di validazione
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // 3️⃣ Gestione referralAltro
    let finalReferral = parsed.data.referral;
    if ((finalReferral === "Altro" || finalReferral === "Ente partner") && parsed.data.referralAltro?.trim()) {
      finalReferral = parsed.data.referralAltro.trim();
    }

    // 4️⃣ Prepara documento da salvare
    const docData = {
      ...parsed.data,
      referral: finalReferral,
      structureIds: parsed.data.canBeAccessedBy || [parsed.data.registeredByStructure],       // strutture dell'operatore (immutabili lato client)
      registeredBy: uid,                      // UID operatore
      registeredByStructure: parsed.data.registeredByStructure, // struttura selezionata nel form
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 5️⃣ Salva in Firestore
    const docRef = await db.collection("anagrafica").add(docData);

    return NextResponse.json({ id: docRef.id, ...docData }, { status: 201 });

  } catch (err) {
    console.error("Errore creazione anagrafica:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}