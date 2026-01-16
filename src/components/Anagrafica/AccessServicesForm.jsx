"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox, CreateMultiCombobox } from "@/components/form/Combobox";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Dropzone } from "@/components/ui/shadcn-io/dropzone";
import DatePicker from "@/components/form/DatePicker";
import { AccessTypes, AccessClassifications } from "@/components/Anagrafica/AccessDialog/AccessTypes";
import clsx from "clsx";

export default function AccessServicesForm({
    state, // The entire access state object (keyed by type.value)
    onChange, // (type, field, value) => void
    showClassification = false,
    showReferralEntity = false,
}) {

    const isTypeValid = (typeValue) => {
        const typeState = state[typeValue];
        if (!typeState) return false;
        // Basic validation: must have subcategories selected. 
        // If 'Altro' is selected, text must be present.
        if (typeState.subCategories.length > 0) {
            if (typeState.subCategories.includes("Altro") && !typeState.altroText.trim()) return false;
            return true;
        }
        return false;
    };

    return (
        <Tabs defaultValue={AccessTypes[0].value} className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-4 overflow-x-auto rounded-md bg-gray-100 border-b px-1">
                <TabsList className="flex w-max space-x-2 overflow-x-auto">
                    {AccessTypes.map((type) => {
                        const isValid = isTypeValid(type.value);
                        return (
                            <TabsTrigger
                                key={type.value}
                                value={type.value}
                                className={clsx(
                                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative",
                                    isValid && "bg-lime-600/20 font-bold"
                                )}
                            >
                                {type.label}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </div>

            {AccessTypes.map((type) => {
                const typeState = state[type.value];
                // Safely fallback if state isn't initialized yet (though it should be)
                if (!typeState) return null;

                return (
                    <TabsContent key={type.value} value={type.value} className="space-y-4 mt-0 flex-1 overflow-y-auto p-1">
                        <div className={clsx("grid gap-4 align-top grid-cols-1 md:grid-cols-2")}>
                            {/* Subcategories */}
                            <div className="flex flex-col gap-2 min-w-0">
                                <CreateMultiCombobox
                                    label="Sottocategorie"
                                    values={typeState.subCategories}
                                    onChange={(values) => {
                                        onChange(type.value, "subCategories", values);
                                        if (!values.includes("Altro")) {
                                            onChange(type.value, "altroText", "");
                                        }
                                    }}
                                    options={type.subCategories || []}
                                    placeholder="Seleziona sottocategorie..."
                                />
                            </div>

                            {/* Altro Input */}
                            {typeState.subCategories.includes("Altro") && (
                                <div className="flex flex-col gap-2 align-top">
                                    {/* Just using a generic Label here to match both designs roughly, 
                        though one had specific htmlFor */}
                                    <Label>Specifica "Altro"</Label>
                                    <Input
                                        value={typeState.altroText}
                                        onChange={(e) => onChange(type.value, "altroText", e.target.value)}
                                        placeholder="Descrizione..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Note Editor */}
                        <div className="space-y-2">
                            <Label>Note aggiuntive</Label>
                            <TiptapEditor
                                content={typeState.content}
                                onChange={(html) => onChange(type.value, "content", html)}
                                placeholder={`Note per ${type.label}...`}
                            />
                        </div>

                        {/* Files */}
                        <div className="space-y-2">
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
                                    onChange(type.value, "files", [...typeState.files, ...newFiles]);
                                }}
                                className="border border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
                            >
                                <p className="text-muted-foreground">Clicca o trascina file qui per caricarli</p>
                            </Dropzone>

                            {typeState.files.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {typeState.files.map((fileObj, idx) => (
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
                                                        const newFiles = typeState.files.filter((_, i) => i !== idx);
                                                        onChange(type.value, "files", newFiles);
                                                    }}
                                                >
                                                    ×
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`file-name-${type.value}-${idx}`} className="text-xs">
                                                        Nome Documento
                                                    </Label>
                                                    <Input
                                                        id={`file-name-${type.value}-${idx}`}
                                                        value={fileObj.name}
                                                        onChange={(e) => {
                                                            const newFiles = [...typeState.files];
                                                            newFiles[idx] = { ...newFiles[idx], name: e.target.value };
                                                            onChange(type.value, "files", newFiles);
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
                                                            const newFiles = [...typeState.files];
                                                            newFiles[idx] = { ...newFiles[idx], creationDate: date };
                                                            onChange(type.value, "files", newFiles);
                                                        }}
                                                        fromYear={2000}
                                                    />
                                                    <DatePicker
                                                        label="Scadenza (Opz.)"
                                                        value={fileObj.expirationDate}
                                                        onChange={(date) => {
                                                            const newFiles = [...typeState.files];
                                                            newFiles[idx] = { ...newFiles[idx], expirationDate: date };
                                                            onChange(type.value, "files", newFiles);
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
                        </div>

                        {/* Extra Fields: Classification & Entity */}
                        {(showClassification || showReferralEntity) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {showClassification && (
                                    <Combobox
                                        label="Classificazione Intervento"
                                        value={typeState.classification}
                                        onChange={(value) => onChange(type.value, "classification", value || "")}
                                        options={AccessClassifications}
                                        placeholder="Seleziona la classificazione..."
                                    />
                                )}
                                {showReferralEntity && (
                                    <div className="flex flex-col gap-2">
                                        <Label>
                                            Ente di riferimento (per Referral)
                                        </Label>
                                        <Input
                                            value={typeState.referralEntity}
                                            onChange={(e) =>
                                                onChange(type.value, "referralEntity", e.target.value || "")
                                            }
                                            placeholder="Seleziona l'ente di riferimento..."
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reminder Section */}
                        <div className="grid gap-2 border-t pt-4 mt-2">
                            <Label className="text-base font-semibold">Promemoria (Opzionale)</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DatePicker
                                    label="Data Promemoria"
                                    value={typeState.reminderDate}
                                    onChange={(date) => onChange(type.value, "reminderDate", date)}
                                    fromYear={new Date().getFullYear()}
                                    toYear={new Date().getFullYear() + 5}
                                />
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor={`time-${type.value}`} className="text-sm font-medium">Ora</Label>
                                    <Input
                                        id={`time-${type.value}`}
                                        type="time"
                                        value={typeState.reminderTime}
                                        onChange={(e) => onChange(type.value, "reminderTime", e.target.value)}
                                        disabled={!typeState.reminderDate}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                );
            })}
        </Tabs>
    );
}
