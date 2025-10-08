"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconBell,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {StructureSwitcher} from "@/components/structure-switcher"
import { useAuth } from "@/context/AuthContext"
import Logo from "../Logo"
import { useParams } from "next/navigation"
import { Skeleton } from "@mui/material"


const data = {


  navMain: [
    {
      title: "Anagrafica",
      url: "anagrafica",
      icon: IconUsers,
    },
   /*  {
      title: "Gestione Community",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Sanitario",
      url: "#",
      icon: IconReport,
    },
    {
      title: "Lavoro",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Legale",
      url: "#",
      icon: IconFileDescription,
    }, */
  ],
  navClouds: [
    {
      title: "Notifiche",
      icon: IconBell,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Eventi in Scadenza",
          url: "#",
        },
        {
          title: "Storico Notifiche",
          url: "#",
        },
      ],
    },
    {
      title: "Documenti",
      icon: IconFileWord,
      url: "#",
      items: [
        {
          title: "Personali",
          url: "#",
        },
        {
          title: "Amministrativi",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
   /*  {
      name: "Archivio Generale",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Report Comunità",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Modulistica",
      url: "#",
      icon: IconFileWord,
    }, */
  ],
}

export function StructureSidebar({
  ...props
}) {
  const { user, loading, availableStructures, currentStructure, setCurrentStructure } = useAuth();
  const {structureId} = useParams();


  React.useEffect(() => {

    if (structureId) {
      const structure = availableStructures.find(s => s.id === structureId);
      if (structure) {
        setCurrentStructure(structure);
      }

    }
  }, [structureId, availableStructures]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard">
                <Logo className="!size-8" size={89} />
                <span className="text-base font-semibold">GPC - OBT</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {availableStructures ? <StructureSwitcher structures={availableStructures} selectedStructure={currentStructure} /> : 
            <Skeleton variant="rectangular" width={210} height={40} className="rounded-lg" />
            }
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {currentStructure && 
        <>
        <NavMain items={data.navMain} structureId={currentStructure.id} />
        <NavDocuments items={data.documents} />
      </>
}
      {/*   <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  );
}
