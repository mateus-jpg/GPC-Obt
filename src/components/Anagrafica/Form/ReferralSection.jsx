import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreateCombobox } from "@/components/form/Combobox";
import { REFERRAL_OPTIONS } from "@/data/formOptions";

export default function ReferralSection({ formData, handleChange }) {
    const data = formData.referral;
    const onChange = (field, value) => handleChange("referral", field, value);

    return (
        <Card className="shadow-sm gap-2 h-full">
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
                    value={data.referral}
                    onChange={(v) => onChange("referral", v)}
                    options={REFERRAL_OPTIONS}
                    placeholder="Seleziona come ci hai conosciuto"
                />
                {(data.referral === "Ente partner" || data.referral === "Altro") && (
                    <div className="space-y-2">
                        <Label htmlFor="referralAltro">Specifica</Label>
                        <Input
                            id="referralAltro"
                            placeholder="Inserisci dettagli specifici"
                            value={data.referralAltro}
                            onChange={(e) => onChange("referralAltro", e.target.value)}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
