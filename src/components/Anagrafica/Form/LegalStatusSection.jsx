import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreateCombobox, CreateMultiCombobox } from "@/components/form/Combobox";
import { LEGAL_STATUS_OPTIONS, HOUSING_STATUS_OPTIONS } from "@/data/formOptions";

export default function LegalStatusSection({ formData, handleChange }) {
    const data = formData.legaleAbitativa;
    const onChange = (field, value) => handleChange("legaleAbitativa", field, value);

    return (
        <Card className="shadow-sm gap-2 h-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                    </span>
                    Situazione Legale e Abitativa
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CreateCombobox
                        label="Situazione legale *"
                        value={data.situazioneLegale}
                        onChange={(v) => onChange("situazioneLegale", v)}
                        options={LEGAL_STATUS_OPTIONS}
                        placeholder="Seleziona stato legale"
                    />

                    <CreateMultiCombobox
                        label="Situazione abitativa * (risposte multiple)"
                        values={data.situazioneAbitativa}
                        onChange={(val) => onChange("situazioneAbitativa", val)}
                        options={HOUSING_STATUS_OPTIONS}
                        placeholder="Seleziona una o più opzioni"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
