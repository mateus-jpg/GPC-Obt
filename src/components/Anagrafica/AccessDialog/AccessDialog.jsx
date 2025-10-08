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
import { AccessTypes } from "./AccessTypes";
import clsx from "clsx";
import { TiptapEditor } from "@/components/tiptap-editor";


export default function AccessDialog() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [altroText, setAltroText] = useState("");

  // Calcola le sottocategorie basandoti sul tipo selezionato
  const currentType = AccessTypes.find((t) => t.label === selectedType);
  const [subCategories, setSubCategories] = useState(currentType ? currentType.subCategories : []);
  const isFormValid =
    !!selectedType &&
    selectedSubcategories.length > 0 &&
    (!selectedSubcategories.includes("Altro") || altroText.trim() !== "");

  // Funzione per resettare tutti gli stati
  const resetForm = () => {
    setContent("");
    setSelectedType("");
    setSelectedSubcategories([]);
    setAltroText("");
  };

  // Gestione apertura/chiusura dialog
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset quando il dialog si chiude
      resetForm();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("currentType", currentType);
    console.log("subcategories", selectedSubcategories);
    
    if (!isFormValid) return;

    const payload = {
      tipoAccesso: selectedType,
      sottocategorie: selectedSubcategories,
      altro: selectedSubcategories.includes("Altro") ? altroText.trim() : undefined,
      contenuto: content
    };

    console.log("👉 Dati da salvare:", payload);
    
    // Chiudi il dialog e resetta dopo il salvataggio
    //setOpen(false);
    //resetForm();
  };

  const handleTypeChange = (value) => {
    // Aggiorna il tipo selezionato
    setSelectedType(value || "");
    
    // Reset delle sottocategorie e del testo altro quando cambia il tipo
    setSelectedSubcategories([]);
    setAltroText("");
    
    // Log per debug
    const newType = AccessTypes.find((t) => t.label === value);
    setSubCategories(newType ? newType.subCategories : []);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Nuovo accesso</Button>
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

          <div 
            className={clsx(
              "grid gap-4 align-top grid-cols-2"
            )}
          >
            {/* STEP 2 — Selezione sottocategorie (appears after a type is selected) */}
            {selectedType && subCategories.length > 0 && (
              <div className="grid gap-2">
                <CreateMultiCombobox
                  label="Sottocategorie"
                  values={selectedSubcategories}
                  onChange={(values) => {
                    setSelectedSubcategories(values);
                    // Se "Altro" non è più selezionato, pulisci il campo di testo
                    if (!values.includes("Altro")) {
                      setAltroText("");
                    }
                  }}
                  options={subCategories}
                  placeholder="Seleziona o aggiungi sottocategorie..."
                />
              </div>
            )}

            {/* STEP 3 — Input for "Altro" (appears if "Altro" is a selected subcategory) */}
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

          {/* Editor di testo */}
          <div className="grid gap-2">
            <Label>Note aggiuntive</Label>
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Inserisci qui eventuali note o dettagli..."
            />
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