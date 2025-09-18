// app/api/anagrafica/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase/firebaseAdmin"; // Admin SDK init
import { z } from "zod";


const db = admin.firestore();
const auth = admin.auth();
// ✅ Schema di validazione con zod
const AnagraficaSchema = z.object({
  cognome: z.string().min(1),
  nome: z.string().min(1),
  sesso: z.enum(["Femmina", "Maschio", "Transessuale", "Altro"]),
  dataDiNascita: z.string().optional(),
  cittadinanza: z.array(z.string()).min(1),
  comuneDiDomicilio: z.string().optional(),
  telefono: z.string().optional(),
  email: z.email().optional(),
  nucleo: z.enum(["singolo", "familiare"]),
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
});

export async function POST(req) {
  try {
    // 1. Recupera cookie di sessione
    const sessionCookie = req.cookies.get(process.env.SESSION_COOKIE_NAME || "session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verifica token
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;
    const operatorDoc = await db.collection("operators").doc(uid).get();

    if (!operatorDoc.exists) {
      return NextResponse.json({ error: "Operatore non trovato" }, { status: 403 });
    }

    const operatorData = operatorDoc.data();
    const operatorStructures = operatorData?.structureIds || [];

    if (operatorStructures.length === 0) {
      return NextResponse.json({ error: "Operatore senza strutture assegnate" }, { status: 403 });
    }

    // 3. Leggi e valida body
    const body = await req.json();
    const parsed = AnagraficaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // 4. Crea documento anagrafica
    const docData = {
      ...parsed.data,
      structureIds: operatorStructures, // 🔒 assegna strutture dall’operatore
      createdBy: uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("anagrafica").add(docData);

    return NextResponse.json({ id: docRef.id, ...docData }, { status: 201 });
  } catch (err) {
    console.error("Errore creazione anagrafica:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}