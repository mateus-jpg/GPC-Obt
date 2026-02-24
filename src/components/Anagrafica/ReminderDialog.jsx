"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createReminderAction } from "@/actions/anagrafica/reminders";
import { AccessTypes } from "@/components/Anagrafica/AccessDialog/AccessTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { convertFileToBase64 } from "@/utils/fileUtils";

export default function ReminderDialog({ anagraficaId, structureId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    serviceType: AccessTypes[0]?.label || "",
    date: "",
    time: "",
    dataScadenza: "",
    enteRiferimento: "",
    note: "",
  });

  const [fileData, setFileData] = useState(null); // { file, dataCreazione, dataScadenza }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFileData(null);
      return;
    }
    setFileData({ file: selected, dataCreazione: "", dataScadenza: "" });
  };

  const handleReset = () => {
    setForm({
      serviceType: AccessTypes[0]?.label || "",
      date: "",
      time: "",
      dataScadenza: "",
      enteRiferimento: "",
      note: "",
    });
    setFileData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date) {
      toast.error("Inserisci la data del promemoria");
      return;
    }

    setLoading(true);
    try {
      // Build ISO datetime from date + time
      const dateTime = form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : new Date(`${form.date}T00:00`).toISOString();

      let filePayload = null;
      if (fileData?.file) {
        const base64 = await convertFileToBase64(fileData.file);
        filePayload = {
          name: fileData.file.name,
          type: fileData.file.type,
          size: fileData.file.size,
          base64,
          creationDate: fileData.dataCreazione || null,
          expirationDate: fileData.dataScadenza || null,
        };
      }

      await createReminderAction({
        anagraficaId,
        structureId,
        serviceType: form.serviceType,
        date: dateTime,
        dataScadenza: form.dataScadenza
          ? new Date(form.dataScadenza).toISOString()
          : null,
        enteRiferimento: form.enteRiferimento || null,
        note: form.note || null,
        file: filePayload,
      });

      toast.success("Promemoria salvato");
      setOpen(false);
      handleReset();
    } catch (err) {
      console.error(err);
      toast.error("Errore durante il salvataggio del promemoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) handleReset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Promemoria
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo Promemoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tipo *</label>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={form.serviceType}
              onChange={(e) => handleChange("serviceType", e.target.value)}
              required
            >
              {AccessTypes.map((t) => (
                <option key={t.value} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Data + Ora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Data *</label>
              <input
                type="date"
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Ora</label>
              <input
                type="time"
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={form.time}
                onChange={(e) => handleChange("time", e.target.value)}
              />
            </div>
          </div>

          {/* Data scadenza */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Data scadenza documento
            </label>
            <input
              type="date"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={form.dataScadenza}
              onChange={(e) => handleChange("dataScadenza", e.target.value)}
            />
          </div>

          {/* Ente */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Ente di riferimento</label>
            <input
              type="text"
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={form.enteRiferimento}
              onChange={(e) => handleChange("enteRiferimento", e.target.value)}
              placeholder="Es. Prefettura, ASL..."
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Note</label>
            <textarea
              className="border rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-y"
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Note aggiuntive..."
            />
          </div>

          {/* Allegato */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Allegato</label>
            <input
              type="file"
              className="text-sm"
              onChange={handleFileChange}
            />
            {fileData && (
              <div className="grid grid-cols-2 gap-3 pl-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    Data creazione documento
                  </label>
                  <input
                    type="date"
                    className="border rounded-md px-2 py-1 text-xs bg-background"
                    value={fileData.dataCreazione}
                    onChange={(e) =>
                      setFileData((prev) => ({
                        ...prev,
                        dataCreazione: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    Scadenza documento
                  </label>
                  <input
                    type="date"
                    className="border rounded-md px-2 py-1 text-xs bg-background"
                    value={fileData.dataScadenza}
                    onChange={(e) =>
                      setFileData((prev) => ({
                        ...prev,
                        dataScadenza: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Annulla
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva Promemoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
