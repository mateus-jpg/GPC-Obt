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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import DatePicker from "@/components/form/DatePicker";

export default function AccessDialog({ anagraficaId, structureId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize state for all types
  const [formsState, setFormsState] = useState(() => {
    const initialState = {};
    AccessTypes.forEach((t) => {
      initialState[t.value] = {
        subCategories: [],
        altroText: "",
        content: "",
        files: [],
        classification: "",
        classification: "",
        referralEntity: "",
        reminderDate: null,
        reminderTime: "",
      };
    });
    return initialState;
  });

  const resetForm = () => {
    const initialState = {};
    AccessTypes.forEach((t) => {
      initialState[t.value] = {
        subCategories: [],
        altroText: "",
        content: "",
        files: [],
        classification: "",
        classification: "",
        referralEntity: "",
        reminderDate: null,
        reminderTime: "",
      };
    });
    setFormsState(initialState);
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const updateField = (typeValue, field, value) => {
    setFormsState((prev) => ({
      ...prev,
      [typeValue]: {
        ...prev[typeValue],
        [field]: value,
      },
    }));
  };

  const isTypeValid = (typeValue) => {
    const state = formsState[typeValue];
    return (
      state.subCategories.length > 0 &&
      (!state.subCategories.includes("Altro") || state.altroText.trim() !== "")
    );
  };

  const getValidTypes = () => {
    return AccessTypes.filter((t) => isTypeValid(t.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validTypes = getValidTypes();

    if (validTypes.length === 0) return;

    setLoading(true);
    try {
      debugger;
      const servicesPayload = validTypes.map((type) => {
        const state = formsState[type.value];

        const cleanedState = {};
        cleanedState.tipoAccesso = type.label;
        if (state.subCategories.length > 0) cleanedState.sottoCategorie = state.subCategories;
        if (state.subCategories.includes("Altro") && state.altroText.trim() !== "")
          cleanedState.altro = state.altroText.trim();
        if (state.content.trim() !== "") cleanedState.note = state.content.trim();
        if (state.classification) cleanedState.classificazione = state.classification;
        if (state.referralEntity) cleanedState.enteRiferimento = state.referralEntity;
        if (state.files.length > 0) {
          cleanedState.files = state.files.map(f => ({
            ...f,
            creationDate: f.creationDate instanceof Date ? f.creationDate.toISOString() : f.creationDate,
            expirationDate: f.expirationDate instanceof Date ? f.expirationDate.toISOString() : f.expirationDate,
          }));
        }
        if (state.reminderDate) {
          const date = new Date(state.reminderDate);
          if (state.reminderTime) {
            const [hours, minutes] = state.reminderTime.split(':');
            date.setHours(parseInt(hours), parseInt(minutes));
          }
          cleanedState.reminderDate = date.toISOString();
        }

        debugger;
        return cleanedState;
      });

      const payload = {
        anagraficaId,
        structureId,
        services: servicesPayload,
      };

      await createAccessAction(payload);

      console.log("Accesso unificato creato con successo");
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Errore durante la creazione dell'accesso:", error);
      alert("Si è verificato un errore durante la creazione dell'accesso.");
    } finally {
      setLoading(false);
    }
  };

  const validTypesCount = getValidTypes().length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild className="cursor-pointer">
        <Button className={""}>
          Nuovo accesso
          <IconDoorEnter className="ml-1" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl min-w-3xl min-h-4xl">
        <DialogHeader>
          <DialogTitle>Registra nuovo accesso </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 w-full flex flex-col overflow-hidden">
          <Tabs defaultValue={AccessTypes[0].value} className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-4 overflow-x-auto rounded-md bg-gray-100  border-b px-1">
              {/* <ScrollArea className="w-full whitespace-nowrap rounded-md border"> */}
              <TabsList className="flex w-max space-x-2 overflow-x-auto ">
                {AccessTypes.map((type) => {
                  const isValid = isTypeValid(type.value);
                  return (
                    <TabsTrigger
                      key={type.value}
                      value={type.value}
                      className={clsx(
                        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative",
                        isValid && "bg-lime-600/20 font-bold",
                      )}
                    >
                      {type.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {/*  </ScrollArea> */}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {AccessTypes.map((type) => {
                const state = formsState[type.value];
                return (
                  <TabsContent key={type.value} value={type.value} className="space-y-6 mt-0">
                    <div className={clsx("grid gap-4 align-top grid-cols-1 md:grid-cols-2")}>
                      {/* Subcategories */}
                      <div className="flex flex-col gap-2 min-w-0">
                        <CreateMultiCombobox
                          label="Sottocategorie"
                          values={state.subCategories}
                          onChange={(values) => {
                            updateField(type.value, "subCategories", values);
                            if (!values.includes("Altro")) {
                              updateField(type.value, "altroText", "");
                            }
                          }}
                          options={type.subCategories}
                          placeholder="Seleziona o aggiungi sottocategorie..."
                        />
                      </div>

                      {/* Altro Input */}
                      {state.subCategories.includes("Altro") && (
                        <div className="flex flex-col gap-2 align-top">
                          <Label htmlFor={`altro-${type.value}`}>Specifica "Altro"</Label>
                          <Input
                            id={`altro-${type.value}`}
                            value={state.altroText}
                            onChange={(e) => updateField(type.value, "altroText", e.target.value)}
                            placeholder="Descrivi la sottocategoria personalizzata"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Note Editor */}
                    <div className="grid gap-2">
                      <Label>Note aggiuntive</Label>
                      <TiptapEditor
                        content={state.content}
                        onChange={(val) => updateField(type.value, "content", val)}
                        placeholder={`Note per ${type.label}...`}
                      />
                    </div>

                    {/* Files & Extra Fields */}
                    <div className="grid gap-2">
                      <Label>Allegati</Label>
                      <Dropzone
                        onDrop={(acceptedFiles) => {
                          const newFiles = acceptedFiles.map((file) => ({
                            file,
                            fileName: file.name,
                            name: file.name,
                            creationDate: new Date(),
                            expirationDate: null,
                          }));
                          updateField(type.value, "files", [...state.files, ...newFiles]);
                        }}
                        className="border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer"
                      >
                        <p className="text-sm text-gray-500">
                          Trascina qui i file o clicca per selezionarli
                        </p>
                      </Dropzone>

                      {/* File list preview */}
                      {state.files.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {state.files.map((fileObj, idx) => (
                            <div
                              key={idx}
                              className="border rounded-md p-3 bg-muted/30 grid gap-3"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium truncate max-w-[80%]">
                                  {fileObj.file.name}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-destructive hover:text-destructive/90"
                                  onClick={() => {
                                    const newFiles = state.files.filter((_, i) => i !== idx);
                                    updateField(type.value, "files", newFiles);
                                  }}
                                >
                                  Rimuovi
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor={`file-name-${idx}`} className="text-xs">
                                    Nome Documento
                                  </Label>
                                  <Input
                                    id={`file-name-${idx}`}
                                    value={fileObj.name}
                                    onChange={(e) => {
                                      const newFiles = [...state.files];
                                      newFiles[idx] = { ...newFiles[idx], name: e.target.value };
                                      updateField(type.value, "files", newFiles);
                                    }}
                                    className="h-9"
                                    placeholder="Nome del documento"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <DatePicker
                                    label="Data Doc."
                                    value={fileObj.creationDate}
                                    onChange={(date) => {
                                      const newFiles = [...state.files];
                                      newFiles[idx] = { ...newFiles[idx], creationDate: date };
                                      updateField(type.value, "files", newFiles);
                                    }}
                                    fromYear={2000}
                                  />
                                  <DatePicker
                                    label="Scadenza (Opz.)"
                                    value={fileObj.expirationDate}
                                    onChange={(date) => {
                                      const newFiles = [...state.files];
                                      newFiles[idx] = { ...newFiles[idx], expirationDate: date };
                                      updateField(type.value, "files", newFiles);
                                    }}
                                    fromYear={new Date().getFullYear()}
                                    toYear={new Date().getFullYear() + 10}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Combobox
                          label="Classificazione Intervento"
                          value={state.classification}
                          onChange={(value) => updateField(type.value, "classification", value || "")}
                          options={AccessClassifications}
                          placeholder="Seleziona la classificazione..."
                        />
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`referral-${type.value}`}>
                            Ente di riferimento (per Referral)
                          </Label>
                          <Input
                            id={`referral-${type.value}`}
                            value={state.referralEntity}
                            onChange={(e) =>
                              updateField(type.value, "referralEntity", e.target.value || "")
                            }
                            placeholder="Seleziona l'ente di riferimento..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reminder Section */}
                    <div className="grid gap-2 border-t pt-4 mt-2">
                      <Label className="text-base font-semibold">Promemoria (Opzionale)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DatePicker
                          label="Data Promemoria"
                          value={state.reminderDate}
                          onChange={(date) => updateField(type.value, "reminderDate", date)}
                          fromYear={new Date().getFullYear()}
                          toYear={new Date().getFullYear() + 5}
                        />
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`time-${type.value}`} className="text-sm font-medium">Ora</Label>
                          <Input
                            id={`time-${type.value}`}
                            type="time"
                            value={state.reminderTime}
                            onChange={(e) => updateField(type.value, "reminderTime", e.target.value)}
                            disabled={!state.reminderDate}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Annulla
              </Button>
            </DialogClose>
            <Button type="submit" disabled={validTypesCount === 0 || loading}>
              {loading ? "Salvataggio..." : `Salva ${validTypesCount > 0 ? `(${validTypesCount})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}