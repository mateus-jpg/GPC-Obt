"use client"
import * as React from "react"
import { ChevronsUpDown, Plus, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useSWRConfig } from "swr"
import { clearStructureCache } from "@/lib/swr-config"

import { useRouter } from "next/navigation"
export function StructureSwitcher({ structures, selectedStructure, user }) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { mutate } = useSWRConfig()

  const handleStructureChange = async (structureId) => {
    // Clear structure-specific cache before navigating
    await clearStructureCache(mutate)
    router.push(`/${structureId}`)
  }

  const isAdmin = user?.role === 'admin'

  let activeStructure = selectedStructure
  if (!selectedStructure) {
    activeStructure = { name: "seleziona struttura" }
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
            {/*   <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Logo className="!size-8" size={89} />
              </div> */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeStructure.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Strutture
            </DropdownMenuLabel>
            {structures.map((structure) => (
              <DropdownMenuItem
                key={structure.id}
                onClick={() => handleStructureChange(structure.id)}
                className="gap-2 p-2"
              >
                {structure.name}
              </DropdownMenuItem>
            ))}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => router.push("/admin/structures/new")}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium">Crea struttura</div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => router.push("/admin/structures")}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Settings className="size-4" />
                  </div>
                  <div className="font-medium">Gestisci strutture</div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

