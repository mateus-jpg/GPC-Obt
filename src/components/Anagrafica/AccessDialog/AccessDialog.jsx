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
import { AccessTypes } from "./AccessTypes";
import { IconDoorEnter } from "@tabler/icons-react";
import { createAccessAction } from "@/actions/anagrafica/access"; // Server Action sicura
import AccessServicesForm from "@/components/Anagrafica/AccessServicesForm";
import { convertFileToBase64 } from "@/utils/fileUtils";



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
      const servicesPayload = await Promise.all(validTypes.map(async (type) => {
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
          cleanedState.files = await Promise.all(state.files.map(async (f) => {
            const base64 = await convertFileToBase64(f.file);
            return {
              name: f.name,
              creationDate: f.creationDate instanceof Date ? f.creationDate.toISOString() : f.creationDate,
              expirationDate: f.expirationDate instanceof Date ? f.expirationDate.toISOString() : f.expirationDate,
              base64,
              type: f.file.type,
              size: f.file.size
            };
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

        return cleanedState;
      }));

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

      <DialogContent className="fixed z-50 grid gap-4 bg-background shadow-lg duration-200 
        w-full h-[100dvh] max-w-none rounded-none border-0 p-0 
        top-0 left-0 translate-x-0 translate-y-0 
        data-[state=open]:slide-in-from-bottom-100 data-[state=closed]:slide-out-to-bottom-100
        sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] 
        sm:w-full sm:max-w-6xl sm:h-auto sm:rounded-lg sm:border sm:p-6
        sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-top-0
      ">
        <DialogHeader className="p-4 sm:p-0">
          <DialogTitle>Registra nuovo accesso </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 w-full flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-0">
            <AccessServicesForm
              state={formsState}
              onChange={updateField}
              showClassification={true}
              showReferralEntity={true}
            />
          </div>

          <DialogFooter className="mt-0 p-4 border-t sm:border-0 sm:p-0 sm:mt-4">
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