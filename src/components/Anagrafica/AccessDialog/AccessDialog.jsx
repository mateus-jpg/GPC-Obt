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
import { IconDoorEnter } from "@tabler/icons-react";
import { createAccessAction } from "@/actions/anagrafica/access"; // Server Action sicura
import AccessServicesForm from "@/components/Anagrafica/AccessServicesForm";
import { toast } from "sonner";
import { useAccessForm } from "@/hooks/useAccessForm";
import PostAccessDialog from "./PostAccessDialog";

export default function AccessDialog({ anagraficaId, structureId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);

  const {
    accessState,
    updateAccessField,
    resetAccessForm,
    getValidAccessTypes,
    prepareAccessPayload
  } = useAccessForm();

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) resetAccessForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validTypes = getValidAccessTypes();

    if (validTypes.length === 0) return;

    setLoading(true);
    try {
      const servicesPayload = await prepareAccessPayload();

      const payload = {
        anagraficaId,
        structureId,
        services: servicesPayload,
      };

      await createAccessAction(payload);
      toast.success("Accesso creato con successo");

      // Handle success dialog
      setLastPayload(servicesPayload);
      setOpen(false); // Close the form dialog
      setShowPostDialog(true); // Open the success/download dialog

    } catch (error) {
      toast.error("Si è verificato un errore durante la creazione dell'accesso.");
    } finally {
      setLoading(false);
    }
  };


  const validTypesCount = getValidAccessTypes().length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild className="cursor-pointer">
          <Button className={""}>
            Nuovo accesso
            <IconDoorEnter className="ml-1" />
          </Button>
        </DialogTrigger>

        <DialogContent className="fixed z-50 grid gap-4 bg-background shadow-lg duration-200 
          w-full h-[100dvh] max-h-[100dvh] max-w-none rounded-none border-0 p-0 
          top-0 left-0 translate-x-0 translate-y-0 
          data-[state=open]:slide-in-from-bottom-100 data-[state=closed]:slide-out-to-bottom-100
          sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] 
          sm:w-full sm:max-w-6xl sm:max-h-[85vh] sm:rounded-lg sm:border sm:p-6
          sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-top-0
        ">
          <DialogHeader className="p-4 sm:p-0">
            <DialogTitle>Registra nuovo accesso </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 w-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-0">
              <AccessServicesForm
                state={accessState}
                onChange={updateAccessField}
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

      <PostAccessDialog
        open={showPostDialog}
        onDone={() => {
          setShowPostDialog(false);
          resetAccessForm();
        }}
        payload={lastPayload}
      />
    </>
  );
}