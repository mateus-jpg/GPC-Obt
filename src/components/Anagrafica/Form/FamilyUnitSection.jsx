import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreateCombobox } from "@/components/form/Combobox";
import { FAMILY_ROLES_OPTIONS } from "@/data/formOptions";

export default function FamilyUnitSection({ formData, handleChange }) {
    const data = formData.nucleoFamiliare;
    const onChange = (field, value) => handleChange("nucleoFamiliare", field, value);

    return (
        <Card className="shadow-sm gap-2 h-full">
            <CardHeader className="gap-1">
                <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        3
                    </span>
                    Nucleo Familiare
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium mb-3 block">Composizione del nucleo familiare *</Label>
                        <RadioGroup
                            onValueChange={(v) => onChange("nucleo", v)}
                            value={data.nucleo}
                            className="space-y-2"
                        >
                            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                                <RadioGroupItem value="singolo" id="singolo" />
                                <Label htmlFor="singolo" className="cursor-pointer flex-1">
                                    <div className="font-medium">Persona singola</div>
                                    <div className="text-sm text-gray-500">Vivo da solo/a</div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                                <RadioGroupItem value="famiglia" id="famiglia" />
                                <Label htmlFor="famiglia" className="cursor-pointer flex-1">
                                    <div className="font-medium">Nucleo familiare</div>
                                    <div className="text-sm text-gray-500">Faccio parte di una famiglia</div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    {data.nucleo === "famiglia" && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CreateCombobox
                                    label="Tipologia nucleo familiare"
                                    value={data.nucleoTipo}
                                    onChange={(v) => onChange("nucleoTipo", v)}
                                    options={FAMILY_ROLES_OPTIONS}
                                    placeholder="Seleziona tipologia"
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="figli">Numero figli minori</Label>
                                    <Input
                                        id="figli"
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={data.figli}
                                        onChange={(e) => onChange("figli", parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
