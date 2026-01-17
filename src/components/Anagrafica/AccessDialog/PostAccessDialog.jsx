import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateICS, downloadICS } from "@/utils/icsUtils";
import { Download } from "lucide-react";

export default function PostAccessDialog({ open, onOpenChange, payload, onDone }) {
    // Extract events
    const events = React.useMemo(() => {
        const list = [];
        if (!payload) return list;

        const items = Array.isArray(payload) ? payload : [payload];

        items.forEach(item => {
            // Reminders
            if (item.reminderDate) {
                list.push({
                    title: `Promemoria: ${item.tipoAccesso}`,
                    description: item.note || `Promemoria per ${item.tipoAccesso}`,
                    start: new Date(item.reminderDate),
                    allDay: false // Timed event
                });
            }

            // Files
            if (item.files && Array.isArray(item.files)) {
                item.files.forEach(file => {
                    if (file.expirationDate) {
                        list.push({
                            title: `Scadenza: ${file.name}`,
                            description: `Documento in scadenza per ${item.tipoAccesso}`,
                            start: new Date(file.expirationDate),
                            allDay: true // Deadline usually all day
                        });
                    }
                });
            }
        });
        return list;
    }, [payload]);

    const hasEvents = events.length > 0;

    // If no events, we might not even want to show this special logic, 
    // but if the parent opens it, we show success message at least.

    const handleDownload = () => {
        const ics = generateICS(events);
        downloadICS("promemoria_scadenze.ics", ics);
    };

    const handleClose = () => {
        if (onDone) onDone();
        else if (onOpenChange) onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Salvataggio completato</DialogTitle>
                    <DialogContent className="pt-2">
                        L'operazione è stata completata con successo.
                        {hasEvents && (
                            <div className="mt-2 text-foreground font-medium">
                                Sono presenti {events.length} eventi (promemoria o scadenze).
                                Vuoi scaricare un file per il tuo calendario?
                            </div>
                        )}
                    </DialogContent>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    {hasEvents && (
                        <Button onClick={handleDownload} variant="outline" className="gap-2 sm:flex-1">
                            <Download className="w-4 h-4" />
                            Scarica Calendario (.ics)
                        </Button>
                    )}
                    <Button onClick={handleClose} className={hasEvents ? "sm:flex-1" : "w-full"}>
                        {hasEvents ? "Chiudi" : "OK"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
