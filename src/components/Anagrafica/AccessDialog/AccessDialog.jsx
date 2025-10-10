"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox, CreateMultiCombobox } from "@/components/form/Combobox";
import { AccessClassifications, AccessTypes } from "./AccessTypes";
import clsx from "clsx";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Dropzone } from "@/components/ui/shadcn-io/dropzone"; // 👈 import della dropzone di shadcn
import { IconDoorEnter } from "@tabler/icons-react";
import { createAccessAction } from "@/actions/anagrafica/access"; // Server Action sicura

export default function AccessDialog({ anagraficaId, structureId }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [altroText, setAltroText] = useState("");
  const [files, setFiles] = useState([]); 
  const [classification, setClassification] = useState("");
  const [referralEntity, setReferralEntity] = useState("");


  // Calcola le sottocategorie basandoti sul tipo selezionato
  const currentType = AccessTypes.find((t) => t.label === selectedType);
  const [subCategories, setSubCategories] = useState(
    currentType ? currentType.subCategories : []
  );

  const isFormValid =
    !!selectedType &&
    selectedSubcategories.length > 0 &&
    (!selectedSubcategories.includes("Altro") || altroText.trim() !== "");

  const resetForm = () => {
    setContent("");
    setSelectedType("");
    setSelectedSubcategories([]);
    setAltroText("");
    setFiles([]);
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      const payload = {
        anagraficaId, // la persona o entità collegata all'accesso
        tipoAccesso: selectedType, 
        sottoCategorie: selectedSubcategories,
        altro: selectedSubcategories.includes("Altro") ? altroText.trim() : undefined,
        note: content?.trim() || undefined,
        classificazione: classification || undefined,
        enteRiferimento: referralEntity || undefined,
        files, 
        structureId, // struttura da cui viene registrato l'accesso
      };
      console.log(files)
      // Chiamata alla Server Action sicura
      const result = await createAccessAction(payload);

      console.log('Accesso creato con successo:', result);

      // Reset e chiusura dialog
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Errore durante la creazione dell’accesso:', error);
      alert('Si è verificato un errore durante la creazione dell’accesso.');
    }
  };

  const handleTypeChange = (value) => {
    setSelectedType(value || "");
    setSelectedSubcategories([]);
    setAltroText("");

    const newType = AccessTypes.find((t) => t.label === value);
    setSubCategories(newType ? newType.subCategories : []);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild className=" cursor-pointer">
        <Button className={""}>Nuovo accesso
          <IconDoorEnter className="ml-1" />
        </Button>

      </DialogTrigger>

      <DialogContent className="max-w-4xl min-w-4xl">
        <DialogHeader>
          <DialogTitle>Registra nuovo accesso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {/* STEP 1 — Selezione tipologia */}
          <div className="grid gap-2">
            <Combobox
              label="Tipologia di accesso"
              value={selectedType}
              onChange={handleTypeChange}
              options={AccessTypes.map((t) => t.label)}
              placeholder="Seleziona la tipologia..."
            />
          </div>

          <div className={clsx("grid gap-4 align-top grid-cols-2")}>
            {/* STEP 2 — Sottocategorie */}
            {selectedType && subCategories.length > 0 && (
              <div className="grid gap-2">
                <CreateMultiCombobox
                  label="Sottocategorie"
                  values={selectedSubcategories}
                  onChange={(values) => {
                    setSelectedSubcategories(values);
                    if (!values.includes("Altro")) setAltroText("");
                  }}
                  options={subCategories}
                  placeholder="Seleziona o aggiungi sottocategorie..."
                />
              </div>
            )}

            {/* STEP 3 — Input Altro */}
            {selectedSubcategories.includes("Altro") && (
              <div className="flex flex-col gap-2 align-top">
                <Label htmlFor="altro">Specifica "Altro"</Label>
                <Input
                  id="altro"
                  value={altroText}
                  onChange={(e) => setAltroText(e.target.value)}
                  placeholder="Descrivi la sottocategoria personalizzata"
                  required
                />
              </div>
            )}
          </div>

          {/* STEP 4 — Editor di testo */}
          <div className="grid gap-2">
            <Label>Note aggiuntive</Label>
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Inserisci qui eventuali note o dettagli..."
            />
          </div>

          {/* STEP 5 — Dropzone per allegati */}
          <div className="grid gap-2">
            <Label>Allegati</Label>
            <Dropzone
              onDrop={(acceptedFiles) => {
                setFiles((prev) => [...prev, ...acceptedFiles]);
              }}
              className="border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer"
            >
              <p className="text-sm text-gray-500">
                Trascina qui i file o clicca per selezionarli
              </p>
            </Dropzone>

            {/* File list preview */}
            {files.length > 0 && (
              <ul className="text-sm mt-2 space-y-1">
                {files.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center border rounded px-3 py-1 bg-muted/30"
                  >
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Rimuovi
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Combobox
                label="Classificazione Intervento"
                value={classification}
                onChange={(value) => setClassification(value || "")}
                options={AccessClassifications}
                placeholder="Seleziona la classificazione..."
              />
              <div className="flex flex-col gap-2">
              <Label htmlFor="referralEntity">Ente di riferimento (per Referral)</Label>
              <Input
                label="Ente di riferimento"
                value={referralEntity}
                onChange={(e) => setReferralEntity(e.target.value || "")}
                placeholder="Seleziona l'ente di riferimento..."
                />
                </div>
              
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annulla
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!isFormValid}>
              Salva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}