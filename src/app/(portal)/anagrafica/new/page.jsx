"use client"

import { useState } from "react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function NuovaAnagraficaPage() {
    const [date, setDate] = useState()
    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Nuova Anagrafica</CardTitle>
                    <CardDescription>Dati personali principali</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name">Nome e Cognome</Label>
                        <Input id="name" placeholder="Es. Ahmed Hassan" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="country">Paese di Origine</Label>
                        <Input id="country" placeholder="Es. Egitto" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Data di Nascita</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"
                                        }`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "dd/MM/yyyy", { locale: it }) : <span>Seleziona data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="nome@mail.com" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="phone">Cellulare</Label>
                        <Input id="phone" type="tel" placeholder="+39 333 1234567" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="photo">Foto</Label>
                        <Input id="photo" type="file" accept="image/*" />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline">Annulla</Button>
                    <Button className="bg-primary text-white">Salva</Button>
                </CardFooter>
            </Card>
        </div>
    )
}