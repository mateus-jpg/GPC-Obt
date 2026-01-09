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
import { AccessTypes } from "../AccessDialog/AccessTypes";
import clsx from "clsx";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Dropzone } from "@/components/ui/shadcn-io/dropzone";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconCalendarPlus } from "@tabler/icons-react";
import { createEventAction } from "@/actions/anagrafica/events";


export default function EventDialog({ anagraficaId, structureId }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [altroText, setAltroText] = useState("");
  const [files, setFiles] = useState([]);

  const [dateTime, setDateTime] = useState(undefined);

  const currentType = AccessTypes.find((t) => t.label === selectedType);
  const [subCategories, setSubCategories] = useState(
    currentType ? currentType.subCategories : []
  );

  const isFormValid =
    !!title &&
    !!selectedType &&
    selectedSubcategories.length > 0 &&
    (!selectedSubcategories.includes("Altro") || altroText.trim() !== "");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedType("");
    setSelectedSubcategories([]);
    setAltroText("");
    setFiles([]);
    setDateTime(undefined);
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
        title,
        anagraficaId,
        tipoEvento: selectedType,
        sottocategorie: selectedSubcategories,
        altro: selectedSubcategories.includes("Altro") ? altroText.trim() : undefined,
        note: content,
        files,
        dataOra: dateTime?.toISOString() || undefined,
        structureId,
      };


      const result = await createEventAction(payload);



      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Errore durante la creazione dell’evento:', error);
      alert('Si è verificato un errore durante la creazione dell’evento.');
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
        <Button className={"bg-background text-primary border-primary border hover:bg-accent hover:text-accent-foreground"}>Nuovo evento
          <IconCalendarPlus className="ml-1" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-8xl min-w-7xl">
        <DialogHeader>
          <DialogTitle>Registra nuovo evento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Colonna 1: Titolo e Tipologia */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titolo</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Inserisci il titolo dell'evento..."
                  required
                />
              </div>

              <div className="grid gap-2">
                <Combobox
                  label="Tipologia (Categorie Accessi)"
                  value={selectedType}
                  onChange={handleTypeChange}
                  options={AccessTypes.map((t) => t.label)}
                  placeholder="Seleziona la tipologia..."
                />
              </div>
            </div>

            {/* Colonna 2: Data e ora */}
            <div className="grid gap-2">
              <Label>Data e Ora Scadenza (opzionale)</Label>
              <div className="flex gap-2">
                {/* Calendar */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 text-left">
                      {dateTime ? dateTime.toLocaleDateString() : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTime}
                      onSelect={(date) => setDateTime((prev) => {
                        if (!prev) return date;
                        return new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate(),
                          prev.getHours(),
                          prev.getMinutes(),
                          prev.getSeconds()
                        );
                      })}
                    />
                  </PopoverContent>
                </Popover>

                {/* Input ora */}
                <Input
                  type="time"
                  className="w-[30%] flex-none"
                  value={dateTime ? dateTime.toTimeString().substring(0, 5) : ""}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    setDateTime((prev) => {
                      const now = prev || new Date();
                      return new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        h,
                        m
                      );
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* STEP 2 — Sottocategorie */}
          <div className={clsx("grid gap-4 align-top grid-cols-2")}>
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

          {/* STEP 3 — Note aggiuntive */}
          <div className="grid gap-2">
            <Label>Note aggiuntive</Label>
            <TiptapEditor content={content} onChange={setContent} placeholder="Inserisci qui eventuali note o dettagli..." />
          </div>

          {/* STEP 4 — Dropzone */}
          <div className="grid gap-2">
            <Label>Allegati</Label>
            <Dropzone
              onDrop={(acceptedFiles) => setFiles((prev) => [...prev, ...acceptedFiles])}
              className="border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer"
            >
              <p className="text-sm text-gray-500">Trascina qui i file o clicca per selezionarli</p>
            </Dropzone>
            {files.length > 0 && (
              <ul className="text-sm mt-2 space-y-1">
                {files.map((file, idx) => (
                  <li key={idx} className="flex justify-between items-center border rounded px-3 py-1 bg-muted/30">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}>Rimuovi</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>



          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit" disabled={!isFormValid}>Salva</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}