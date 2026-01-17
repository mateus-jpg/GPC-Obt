import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreateCombobox } from "@/components/form/Combobox";
import {
    JOB_STATUS_OPTIONS,
    EDUCATION_LEVEL_OPTIONS,
    EDUCATION_LEVEL_IT_OPTIONS,
    ITALIAN_LEVEL_OPTIONS
} from "@/data/formOptions";

export default function WorkEducationSection({ formData, handleChange }) {
    const data = formData.lavoroFormazione;
    const onChange = (field, value) => handleChange("lavoroFormazione", field, value);

    return (
        <Card className="shadow-sm gap-2 h-full">
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
                        value={data.situazioneLavorativa}
                        onChange={(v) => onChange("situazioneLavorativa", v)}
                        options={JOB_STATUS_OPTIONS}
                        placeholder="Seleziona situazione lavorativa"
                    />

                    <CreateCombobox
                        label="Titolo di studio nel paese di origine *"
                        value={data.titoloDiStudioOrigine}
                        onChange={(v) => onChange("titoloDiStudioOrigine", v)}
                        options={EDUCATION_LEVEL_OPTIONS}
                        placeholder="Seleziona titolo di studio"
                    />
                    <CreateCombobox
                        label="Titolo di studio riconosciuto in Italia *"
                        value={data.titoloDiStudioItalia}
                        onChange={(v) => onChange("titoloDiStudioItalia", v)}
                        options={EDUCATION_LEVEL_IT_OPTIONS}
                        placeholder="Seleziona titolo di studio"
                    />
                    <CreateCombobox
                        label="Grado di conoscenza dell'italiano (emerso dal colloquio) *"
                        value={data.conoscenzaItaliano}
                        onChange={(v) => onChange("conoscenzaItaliano", v)}
                        options={ITALIAN_LEVEL_OPTIONS}
                        placeholder="Seleziona livello di italiano"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
