"use client";

import React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import DatePicker from "@/components/form/DatePicker";
import Countries from "@/data/countries.json"; // Assuming you have a countries.json file
import { CreateCombobox, CreateMultiCombobox } from "@/components/form/Combobox";
import { useParams } from "next/navigation";


export default function AnagraficaForm({params}) {
  const { structureId } = React.use(params);

  const [formData, setFormData] = useState({
    // Informazioni Anagrafiche
    cognome: "",
    nome: "",
    sesso: "",
    dataDiNascita: undefined,
    cittadinanza: [],
    comuneDiDomicilio: "",
    telefono: "",
    email: "",

    // Nucleo Familiare
    nucleo: "singolo",
    nucleoTipo: "",
    figli: 0,

    // Situazione Legale e Abitativa
    situazioneLegale: "",
    situazioneAbitativa: [],

    // Lavoro e Formazione
    situazioneLavorativa: "",
    titoloDiStudioOrigine: "",
    titoloDiStudioItalia: "",
    conoscenzaItaliano: "",
    
    // Vulnerabilità e Prospettive
    vulnerabilita: [],
    intenzioneItalia: "",
    paeseDestinazione: "",

    // Referral
    referral: "",
    referralAltro: "",
    registeredBy: structureId || null,
    canBeAccessedBy: [structureId] || [],

  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    /* try {
      const res = await fetch("/api/anagrafica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Errore nel salvataggio");

      alert("Dati salvati correttamente ✅");
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio ❌");
    } */
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scheda Anagrafica
          </h1>
          <p className="text-gray-600">
            Compila tutti i campi richiesti per completare la registrazione
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Informazioni Anagrafiche */}
          <Card className="shadow-sm gap-2">
            <CardHeader className="">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Informazioni Anagrafiche
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input id="cognome" value={formData.cognome} onChange={(e) => handleChange("cognome", e.target.value)} placeholder="Inserisci cognome" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} placeholder="Inserisci nome" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CreateCombobox label="Sesso *" value={formData.sesso} onChange={(v) => handleChange("sesso", v)} options={["Maschio", "Femmina", "Transessuale", "Altro"]} placeholder="Seleziona sesso" />
                <DatePicker label="Data di nascita" required={true} value={formData.dataDiNascita} onChange={(date) => handleChange("dataDiNascita", date)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <CreateMultiCombobox label="Paese di provenienza / Cittadinanza *" values={formData.cittadinanza} onChange={(val) => handleChange("cittadinanza", val)} options={Countries.map(c => c.name)} placeholder="Seleziona uno o più paesi" />
              
              <div className="space-y-2">
                <Label htmlFor="comuneDiDomicilio">Comune di domicilio</Label>
                <Input id="comuneDiDomicilio" value={formData.comuneDiDomicilio} onChange={(e) => handleChange("comuneDiDomicilio", e.target.value)} placeholder="Es. Verona" />
              </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Numero di cellulare *</Label>
                  <Input id="telefono" value={formData.telefono} onChange={(e) => handleChange("telefono", e.target.value)} placeholder="+39 123 456789" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="utente@esempio.com" required />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 2. Nucleo Familiare */}
          <Card className="shadow-sm gap-2">
            <CardHeader className="gap-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                Nucleo Familiare
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Composizione del nucleo familiare *</Label>
                  <RadioGroup onValueChange={(v) => handleChange("nucleo", v)} value={formData.nucleo} className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="singolo" id="singolo" />
                      <Label htmlFor="singolo" className="cursor-pointer flex-1"><div className="font-medium">Persona singola</div><div className="text-sm text-gray-500">Vivo da solo/a</div></Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="famiglia" id="famiglia" />
                      <Label htmlFor="famiglia" className="cursor-pointer flex-1"><div className="font-medium">Nucleo familiare</div><div className="text-sm text-gray-500">Faccio parte di una famiglia</div></Label>
                    </div>
                  </RadioGroup>
                </div>
                {formData.nucleo === "famiglia" && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CreateCombobox label="Tipologia nucleo familiare" value={formData.nucleoTipo} onChange={(v) => handleChange("nucleoTipo", v)} options={["Donna sola con minori", "Uomo solo con minori", "Coppia senza figli", "Coppia con figli", "Altro"]} placeholder="Seleziona tipologia" />
                      <div className="space-y-2">
                        <Label htmlFor="figli">Numero figli minori</Label>
                        <Input id="figli" type="number" min="0" max="10" value={formData.figli} onChange={(e) => handleChange("figli", parseInt(e.target.value) || 0)} placeholder="0" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 3. Situazione Legale e Abitativa */}
          <Card className="shadow-sm gap-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                Situazione Legale e Abitativa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

               <CreateCombobox
                  label="Situazione legale *"
                  value={formData.situazioneLegale}
                  onChange={(v) => handleChange("situazioneLegale", v)}
                  options={[
                    "In movimento/Irregolare sul territorio",
                    "Non ancora richiedente asilo, ma manifesta la volontà",
                    "Richiedente protezione internazionale",
                    "Richiedente protezione speciale direttamente al Questore",
                    "Ricorrente/in attesa di presentare ricorso",
                    "Titolare di protezione internazionale (status rifugiato o sussidiaria)",
                    "Titolare di protezione umanitaria",
                    "Titolare protezione speciale",
                    "PdS casi speciali (richiesta/rinnovo/titolare)",
                    "Pds motivi familiari (richiesta/rinnovo/titolare)",
                    "Pds motivi di lavoro (richiesta/rinnovo/titolare)",
                    "Pds attesa occupazione (richiesta/rinnovo/titolare)",
                    "PdS studio (richiesta/rinnovo/titolare)",
                    "PdS minore età (richiesta/rinnovo/titolare)",
                    "PdS cure mediche (richiesta/rinnovo/titolare)",
                    "PdS lungo periodo (richiesta/rinnovo/titolare)",
                    "Residenza elettiva (richiesta/rinnovo/titolare)",
                    "Art. 31 (richiesta/rinnovo/titolare)",
                    "Regolare in esecuzione penale esterna",
                    "Richiesta cittadinanza italiana",
                    "Cittadino Italiano",
                    "Pds di altro paese UE",
                    "Non dichiarata dalla persona",
                    "Altro",
                  ]}
                  placeholder="Seleziona stato legale"
                  />
                <CreateMultiCombobox
                  label="Situazione abitativa * (risposte multiple)"
                  values={formData.situazioneAbitativa}
                  onChange={(val) => handleChange("situazioneAbitativa", val)}
                  options={[
                    "Senza fissa dimora",
                    "Senza dimora ma con dichiarazione di ospitalità",
                    "In attesa di accoglienza",
                    "In accoglienza CAS",
                    "In accoglienza SAI",
                    "Casa in affitto (tutti i tipi di contratto)",
                    "Casa in affitto con procedura di sfratto in essere",
                    "Dormitorio",
                    "Struttura occupata",
                    "Alloggio presso terzi con pagamento di affitto senza contratto",
                    "Housing/strutture temporanee NON di CSD",
                    "Domiciliari",
                    "Struttura esecuzione penale",
                    "Accoglienza gratuita (amici, conoscenti, famiglie)",
                    "Casa di proprietà",
                    "Alberghi/pensionati/hotel",
                    "Studentati universitari",
                    "Alloggi di edilizia sociale (case popolari, etc.)",
                    "Non dichiarata dalla persona",
                    "Altro",
                  ]}
                  placeholder="Seleziona una o più opzioni"
                  />
                  </div>
            </CardContent>
          </Card>

          {/* 4. Lavoro e Formazione */}
          <Card className="shadow-sm gap-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </span>
                Lavoro e Formazione
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CreateCombobox
                label="Situazione lavorativa *"
                value={formData.situazioneLavorativa}
                onChange={(v) => handleChange("situazioneLavorativa", v)}
                options={[
                  "Disoccupato/a",
                  "Dipendente con contratto a tempo indeterminato",
                  "Dipendente con contratto a tempo determinato",
                  "Contratto a chiamata/cococo/a progetto/voucher/occasionali",
                  "Contratto di somministrazione",
                  "Libero professionista",
                  "Lavoro in nero",
                  "Lavoro grigio",
                  "Tirocinio",
                  "Apprendistato",
                  "In pensione",
                  "Studente/studentessa",
                  "Non dichiarata dalla persona",
                  "Altro",
                ]}
                placeholder="Seleziona situazione lavorativa"
              />
              
                <CreateCombobox
                  label="Titolo di studio nel paese di origine *"
                  value={formData.titoloDiStudioOrigine}
                  onChange={(v) => handleChange("titoloDiStudioOrigine", v)}
                  options={["Nessuno", "Elementare", "Licenza media", "Diploma scuola superiore", "Università", "Non dichiarato", "Altro"]}
                  placeholder="Seleziona titolo di studio"
                />
                <CreateCombobox
                  label="Titolo di studio riconosciuto in Italia *"
                  value={formData.titoloDiStudioItalia}
                  onChange={(v) => handleChange("titoloDiStudioItalia", v)}
                  options={["Nessun titolo", "Licenza media in Italia", "Diploma di scuola superiore in Italia", "Università in Italia", "Non dichiarato", "Altro"]}
                  placeholder="Seleziona titolo di studio"
                />
              <CreateCombobox
                label="Grado di conoscenza dell'italiano (emerso dal colloquio) *"
                value={formData.conoscenzaItaliano}
                onChange={(v) => handleChange("conoscenzaItaliano", v)}
                options={["La persona non parla italiano", "Base", "Intermedio", "Avanzato", "Madrelingua", "Altro"]}
                placeholder="Seleziona livello di italiano"
                />
                </div>
            </CardContent>
          </Card>
          
          {/* 5. Vulnerabilità e Prospettive */}
          <Card className="shadow-sm gap-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  
                  5
                </span>
                Vulnerabilità e Prospettive
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <CreateMultiCombobox
                  label="Vulnerabilità del singolo o di uno dei membri del nucleo *"
                  values={formData.vulnerabilita}
                  onChange={(v) => handleChange("vulnerabilita", v)}
                  options={[
                    "Nessuna vulnerabilità emersa",
                    "Minore non accompagnato",
                    "Donna incinta",
                    "Vulnerabilità psicologica e/o psichiatrica",
                    "Disabilità mentale (con certificazione)",
                    "Disabilità fisica",
                    "Malattia grave",
                    "Vittima/potenziale vittima di tratta",
                    "Vittima di violenza",
                    "Possibili dipendenze",
                    "Altro"
                  ]}
                  placeholder="Seleziona eventuali vulnerabilità"
                  />
                  <div className="space-y-4">
                <div className="space-y-4">
                  <Label>Ha intenzione di fermarsi in Italia? *</Label>
                  <RadioGroup onValueChange={(v) => handleChange("intenzioneItalia", v)} value={formData.intenzioneItalia} className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SI" id="int-si" />
                      <Label htmlFor="int-si">SI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NO" id="int-no" />
                      <Label htmlFor="int-no">NO</Label>
                    </div>
                  </RadioGroup>
                </div>
                {formData.intenzioneItalia === "NO" && (
                  <div className="space-y-2">
                    <Label htmlFor="paeseDestinazione">Dove ha intenzione di proseguire il viaggio?</Label>
                    <Input id="paeseDestinazione" value={formData.paeseDestinazione} onChange={(e) => handleChange("paeseDestinazione", e.target.value)} placeholder="Inserisci il paese di destinazione" />
                  </div>
                )}
                </div>
                </div>
            </CardContent>
          </Card>

          {/* 6. Come ci hai conosciuto? */}
          <Card className="shadow-sm gap-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  6
                </span>
                Come ci hai conosciuto?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              <CreateCombobox
                label="Come hai conosciuto il Community Center? *"
                value={formData.referral}
                onChange={(v) => handleChange("referral", v)}
                options={["Comune di Verona", "Volontari fuori questura", "CESAIM", "Ente partner", "Social Media/Sito web", "Passaparola", "Altro"]}
                placeholder="Seleziona come ci hai conosciuto"
              />
              {(formData.referral === "Ente partner" || formData.referral === "Altro") && (
                <div className="space-y-2">
                  <Label htmlFor="referralAltro">Specifica</Label>
                  <Input id="referralAltro" placeholder="Inserisci dettagli specifici" value={formData.referralAltro} onChange={(e) => handleChange("referralAltro", e.target.value)} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-2">
            <Button type="submit" size="lg" className="w-full md:w-auto min-w-[200px] h-12 text-base font-medium">
              💾 Salva Anagrafica
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}