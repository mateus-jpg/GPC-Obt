import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import DatePicker from "@/components/form/DatePicker";
import { CreateCombobox, CreateMultiCombobox } from "@/components/form/Combobox";
import Countries from "@/data/countries.json";
import { GENDER_OPTIONS } from "@/data/formOptions";

export default function PersonalInfoSection({ formData, handleChange }) {
    // formData here expects the whole formData object or just the anagrafica part depending on how we pass it.
    // Let's assume we pass the full formData for flexibility, or just formData.anagrafica.
    // Looking at the original code: value={formData.anagrafica.cognome}
    // So let's pass the specific section data for cleaner props if possible, BUT handleChange in parent expects (group, field, value).
    // So passing the whole formData and the parent handleChange is the easiest path for now.

    const data = formData.anagrafica;
    const onChange = (field, value) => handleChange("anagrafica", field, value);

    return (
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
                        <Input
                            id="cognome"
                            value={data.cognome}
                            onChange={(e) => onChange("cognome", e.target.value)}
                            placeholder="Inserisci cognome"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome *</Label>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => onChange("nome", e.target.value)}
                            placeholder="Inserisci nome"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CreateCombobox
                        label="Sesso *"
                        value={data.sesso}
                        onChange={(v) => onChange("sesso", v)}
                        options={GENDER_OPTIONS}
                        placeholder="Seleziona sesso"
                    />
                    <DatePicker
                        label="Data di nascita"
                        required={true}
                        value={data.dataDiNascita}
                        onChange={(date) => onChange("dataDiNascita", date)}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CreateMultiCombobox
                        label="Paese di provenienza / Cittadinanza *"
                        values={data.cittadinanza}
                        onChange={(val) => onChange("cittadinanza", val)}
                        options={Countries.map(c => c.name)}
                        placeholder="Seleziona uno o più paesi"
                    />
                    <CreateCombobox
                        label="Luogo di nascita *"
                        value={data.luogoDiNascita}
                        onChange={(val) => onChange("luogoDiNascita", val)}
                        options={Countries.map(c => c.name)}
                        placeholder="Seleziona paese"
                    />
                    <div className="space-y-2">
                        <Label htmlFor="comuneDiDomicilio">Comune di domicilio</Label>
                        <Input
                            id="comuneDiDomicilio"
                            value={data.comuneDiDomicilio}
                            onChange={(e) => onChange("comuneDiDomicilio", e.target.value)}
                            placeholder="Es. Verona"
                        />
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="telefono">Numero di cellulare </Label>
                        <Input
                            id="telefono"
                            value={data.telefono}
                            onChange={(e) => onChange("telefono", e.target.value)}
                            placeholder="+39 123 456789"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email </Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => onChange("email", e.target.value)}
                            placeholder="utente@esempio.com"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
