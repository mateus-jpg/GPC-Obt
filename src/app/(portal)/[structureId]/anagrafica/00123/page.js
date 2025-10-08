import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { IconFileText, IconUser, IconGlobe, IconHeartbeat, IconBriefcase, IconClipboardList } from "@tabler/icons-react"

export default function AnagraficaPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Scheda Anagrafica</h1>
        <Button variant="outline">Modifica Dati</Button>
      </div>

      {/* Card Info Principali */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUser className="w-5 h-5" /> Ahmed Hassan
          </CardTitle>
          <CardDescription>ID: #00123</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <IconGlobe className="w-4 h-4" /> Paese di Origine
            </span>
            <span className="font-medium">Egitto</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <IconHeartbeat className="w-4 h-4" /> Sanitario
            </span>
            <Badge variant="outline">Visita programmata</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <IconBriefcase className="w-4 h-4" /> Lavoro
            </span>
            <span className="font-medium">In formazione</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <IconClipboardList className="w-4 h-4" /> Legale
            </span>
            <Badge variant="secondary">Permesso in corso</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Documenti */}
      <Card>
        <CardHeader>
          <CardTitle>Documenti Collegati</CardTitle>
          <CardDescription>Ultimi documenti caricati</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <IconFileText className="w-5 h-5 text-muted-foreground" />
              <span>Permesso di soggiorno.pdf</span>
            </div>
            <Button size="sm" variant="outline">Apri</Button>
          </div>
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <IconFileText className="w-5 h-5 text-muted-foreground" />
              <span>Certificato medico.pdf</span>
            </div>
            <Button size="sm" variant="outline">Apri</Button>
          </div>
        </CardContent>
      </Card>

      {/* Storico */}
      <Card>
        <CardHeader>
          <CardTitle>Storico Attività</CardTitle>
          <CardDescription>Ultimi aggiornamenti della scheda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>📌 01/09/2025 – Inserito nuovo documento: <b>Certificato medico</b></div>
          <Separator />
          <div>📌 15/08/2025 – Aggiornato stato Sanitario: <b>Visita programmata</b></div>
          <Separator />
          <div>📌 02/08/2025 – Creata scheda anagrafica</div>
        </CardContent>
      </Card>
    </div>
  )
}