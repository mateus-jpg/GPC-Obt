# GPC - Gestione Presa in Carico

Piattaforma per la gestione delle anagrafiche e delle prese in carico per il Comunity center di Verona, sviluppata per OneBridge, attualmente in Beta.

## 🚀 Tecnologie Utilizzate

Il progetto è costruito con un moderno stack tecnologico basato su React e Next.js:

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Linguaggio**: JavaScript / React 19
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
*   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (basato su Radix UI)
*   **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Authentication)
*   **Admin SDK**: `firebase-admin` per operazioni server-side sicure
*   **Middleware Auth**: Custom middleware per gestione sessioni e protezione rotte

## 🛠️ Prerequisiti

Prima di iniziare, assicurati di avere installato:

*   [Node.js](https://nodejs.org/) (versione 18 o superiore)


## 🏗️ Struttura del Progetto

*   `src/app`: Contiene le pagine e le rotte dell'applicazione (App Router).
    *   `(portal)`: Layout principale per l'area autenticata.
    *   `api`: Endpoint API server-side (es. creazione anagrafica, auth).
*   `src/components`: Componenti UI riutilizzabili (pulsanti, form, card, ecc.).
*   `src/lib`: Librerie e configurazioni (es. client Firebase).
*   `src/middleware.js`: Logica di protezione delle rotte e verifica sessione.

## 🚀 Deployment

Il progetto è configurato per il deployment su **Firebase App Hosting** tramite il file `apphosting.yaml`.



## 📝 Funzionalità Principali

*   **Gestione Anagrafica**: Creazione, modifica e visualizzazione schede beneficiari.
*   **Dati Strutturati**: Gestione informazioni complesse (Nucleo Familiare, Situazione Legale, Vulnerabilità, ecc.).
*   **Sicurezza**: Accesso basato su ruoli e strutture di appartenenza.
*   **Audit**: Tracciamento di chi ha creato o modificato le schede.


---
Sviluppato per OneBridge.

## 📌 TODO

### Completati ✅
*   [x] Implementazione Middleware Auth Custom (sostituisce next-firebase-auth-edge)
*   [x] Refactoring struttura dati anagrafica (nested objects)
*   [x] Implementazione `canBeAccessedBy` a livello root
*   [x] Configurazione Firebase App Hosting con Secret Manager
*   [x] Aggiornamento form creazione e modifica anagrafica

### In Corso / Futuri 🚧
*   [ ] Completare la migrazione dei dati esistenti
*   [ ] Implementare reportistica avanzata
*   [ ] Ottimizzare le performance del caricamento dati
*   [ ] Aggiungere test end-to-end
*   [ ] Aggiungere encription con key CMEK dei file caricati
*   [ ] Aggiungere calendario condivo per struttura

### Visione futura 
*   [ ] Flusso di analisi AI per capire lo stato di avanzamento del migrante
*   [ ] OCR nel caricamento dei file