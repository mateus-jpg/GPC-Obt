"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

import Countries from "@/data/countries.json"; // Assuming you have a countries.json file
import { CreateCombobox } from "@/components/form/Combobox";

export default function AnagraficaForm() {
  const [formData, setFormData] = useState({
    cognome: "",
    nome: "",
    sesso: "",
    cittadinanza: "",
    nucleo: "singolo",
    nucleoTipo: "",
    figli: 0,
    eta: "",
    referral: "",
    referralAltro: "",
    situazioneLegale: "",
    situazioneAbitativa: [],
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, option) => {
    setFormData((prev) => {
      const updated = prev[field].includes(option)
        ? prev[field].filter((item) => item !== option)
        : [...prev[field], option];
      return { ...prev, [field]: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submit:", formData);
    // TODO: save to Firestore
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-full px-4 gap-4 ">
      <Card>
        <CardHeader>
          <CardTitle>Anagrafica</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cognome</Label>
              <Input
                value={formData.cognome}
                onChange={(e) => handleChange("cognome", e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Sesso */}
          <div>
            <Label>Sesso</Label>
            <RadioGroup
              onValueChange={(v) => handleChange("sesso", v)}
              value={formData.sesso}
            >
              {["Femmina", "Maschio", "Transessuale", "Altro"].map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={opt} />
                  <Label htmlFor={opt}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Cittadinanza - CreateCombobox */}
          <CreateCombobox
            label="Paese di provenienza / Cittadinanza"
            value={formData.cittadinanza}
            onChange={(val) => handleChange("cittadinanza", val)}
            options={Countries.map(c => c.name)}
            placeholder="Seleziona paese"
          />

          {/* Nucleo familiare */}
          <div>
            <Label>Nucleo Familiare</Label>
            <RadioGroup
              onValueChange={(v) => handleChange("nucleo", v)}
              value={formData.nucleo}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="singolo" id="singolo" />
                <Label htmlFor="singolo">Singola</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="famiglia" id="famiglia" />
                <Label htmlFor="famiglia">Parte di un nucleo familiare</Label>
              </div>
            </RadioGroup>
            {formData.nucleo === "famiglia" && (
              <div className="mt-2 space-y-2">
                <CreateCombobox
                  label="Tipologia nucleo"
                  value={formData.nucleoTipo}
                  onChange={(v) => handleChange("nucleoTipo", v)}
                  options={[
                    "Donna sola con minori",
                    "Uomo solo con minori",
                    "Coppia senza figli",
                    "Altro",
                  ]}
                  placeholder="Seleziona tipologia"
                />
                <div>
                  <Label>Numero figli minori</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.figli}
                    onChange={(e) => handleChange("figli", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Età */}
          <CreateCombobox
            label="Età"
            value={formData.eta}
            onChange={(v) => handleChange("eta", v)}
            options={["<18", "18-20", "21-30", "31-40", "41-50", "51-60", ">60"]}
            placeholder="Seleziona fascia"
          />

          {/* Referral */}
          <CreateCombobox
            label="Come conosce il Community Center?"
            value={formData.referral}
            onChange={(v) => handleChange("referral", v)}
            options={[
              "Comune di Verona",
              "Volontari fuori questura",
              "CESAIM",
              "Ente partner",
              "Social/Sito",
              "Altro",
            ]}
            placeholder="Seleziona opzione"
          />
          {(formData.referral === "Ente partner" ||
            formData.referral === "Altro") && (
            <Input
              placeholder="Specifica"
              onChange={(e) => handleChange("referralAltro", e.target.value)}
            />
          )}

          {/* Situazione legale */}
          <CreateCombobox
            label="Situazione legale"
            value={formData.situazioneLegale}
            onChange={(v) => handleChange("situazioneLegale", v)}
            options={[
              "In movimento/Irregolare",
              "Richiedente protezione internazionale",
              "Titolare protezione internazionale",
              "Cittadino Italiano",
              "Altro",
            ]}
            placeholder="Seleziona stato legale"
          />

          {/* Situazione abitativa */}
          <div>
            <Label>Situazione abitativa</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Senza fissa dimora",
                "In accoglienza CAS",
                "Casa in affitto",
                "Dormitorio",
                "Altro",
              ].map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.situazioneAbitativa.includes(opt)}
                    onCheckedChange={() =>
                      handleCheckboxChange("situazioneAbitativa", opt)
                    }
                  />
                  <Label>{opt}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full">
            Salva Anagrafica
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}