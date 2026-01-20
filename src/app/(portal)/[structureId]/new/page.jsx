"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
// Action
import { createAnagrafica } from "@/actions/anagrafica/anagrafica";
import { useAccessForm } from "@/hooks/useAccessForm";
import AccessServicesForm from "@/components/Anagrafica/AccessServicesForm";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Form Components
import PersonalInfoSection from "@/components/Anagrafica/Form/PersonalInfoSection";
import FamilyUnitSection from "@/components/Anagrafica/Form/FamilyUnitSection";
import LegalStatusSection from "@/components/Anagrafica/Form/LegalStatusSection";
import WorkEducationSection from "@/components/Anagrafica/Form/WorkEducationSection";
import VulnerabilitySection from "@/components/Anagrafica/Form/VulnerabilitySection";
import ReferralSection from "@/components/Anagrafica/Form/ReferralSection";
import PostAccessDialog from "@/components/Anagrafica/AccessDialog/PostAccessDialog";
export default function AnagraficaForm({ params }) {
  const { structureId } = React.use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);
  const [redirectId, setRedirectId] = useState(null);

  // Use Custom Hook for Access Logic
  const {
    accessState,
    updateAccessField,
    prepareAccessPayload
  } = useAccessForm();

  // Form Data for Anagrafica
  // Form Data for Anagrafica
  const [formData, setFormData] = useState({
    anagrafica: {
      cognome: "",
      nome: "",
      sesso: "",
      dataDiNascita: undefined,
      luogoDiNascita: "",
      cittadinanza: [],
      comuneDiDomicilio: "",
      telefono: "",
      email: "",
    },
    nucleoFamiliare: {
      nucleo: "singolo",
      nucleoTipo: "",
      figli: 0,
    },
    legaleAbitativa: {
      situazioneLegale: "",
      situazioneAbitativa: [],
    },
    lavoroFormazione: {
      situazioneLavorativa: "",
      titoloDiStudioOrigine: "",
      titoloDiStudioItalia: "",
      conoscenzaItaliano: "",
    },
    vulnerabilita: {
      vulnerabilita: [],
      intenzioneItalia: "",
      paeseDestinazione: "",
    },
    referral: {
      referral: "",
      referralAltro: "",
    },
    canBeAccessedBy: [structureId] || [],
  });

  const handleChange = (group, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!user || !user.uid) throw new Error("Utente non autenticato");

      // 1. Prepare Anagrafica Payload
      const payload = {
        ...formData,
        registeredByStructure: structureId,
      };

      if (payload.referral.referral === "Altro" || payload.referral.referral === "Ente partner") {
        if (payload.referral.referralAltro?.trim()) {
          payload.referral.referral = payload.referral.referralAltro.trim();
        }
      }
      delete payload.referral.referralAltro;

      // 2. Prepare Services (Access) Payload via Hook
      const servicesPayload = await prepareAccessPayload();

      // 3. Call Server Action
      const resultStr = await createAnagrafica(payload, servicesPayload);
      const result = JSON.parse(resultStr);
      if (result.error) {
        toast.error("Errore durante il salvataggio: " + result.message);
        return;
      }
      console.log("Anagrafica creata:", result);
      toast.success("Dati salvati correttamente");

      // Check if there are any reminders or deadlines to offer ICS download
      const hasReminders = servicesPayload.some(s => s.reminderDate || s.files?.some(f => f.expirationDate));

      if (hasReminders) {
        setLastPayload(servicesPayload);
        setRedirectId(result.id);
        setShowPostDialog(true);
      } else {
        // Redirect immediately if no reminders
        router.push(`/${structureId}/anagrafica/${result.id}`);
      }

    } catch (err) {
      console.error("Errore submit anagrafica:", err);
      toast.error("Errore durante il salvataggio: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  // ... rest of component

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scheda Anagrafica
          </h1>
          <p className="text-gray-600">
            Compila tutti i campi richiesti per completare la registrazione
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:flex-wrap gap-4 w-full">
          {/* Each card section */}
          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <PersonalInfoSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <LegalStatusSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <FamilyUnitSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <WorkEducationSection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <VulnerabilitySection formData={formData} handleChange={handleChange} />
          </div>

          <div className="w-full lg:w-[calc(50%-8px)] min-w-0">
            <ReferralSection formData={formData} handleChange={handleChange} />
          </div>

          {/* 7. PRIMO ACCESSO (NEW SECTION) */}
          <div className="w-full min-w-0">
            <Card className="shadow-sm border-blue-200 ring-1 ring-blue-100">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    7
                  </span>
                  Registra Primo Accesso & Documenti (Opzionale)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <AccessServicesForm
                  state={accessState}
                  onChange={updateAccessField}
                />
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-2 col-span-2 w-full">
            <Button
              type="submit"
              size="lg"
              disabled={isSaving}
              className="w-full md:w-auto min-w-[200px] h-12 text-base font-medium"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>💾 Salva Anagrafica e Accessi</>
              )}
            </Button>
          </div>

        </form>

        <PostAccessDialog
          open={showPostDialog}
          payload={lastPayload}
          onDone={() => {
            setShowPostDialog(false);
            if (redirectId) {
              router.push(`/${structureId}/anagrafica/${redirectId}`);
            }
          }}
        />
      </div >
    </div >
  );
}