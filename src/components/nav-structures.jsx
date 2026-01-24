"use client"

import { IconDots, IconFolder, IconShare3, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
export function NavStructures({
  items,
  structureId
}) {
  const { isMobile } = useSidebar()
    const router = useRouter()
    const pathname = usePathname();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Struttura</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => (
          <SidebarMenuItem key={index}>

            <SidebarMenuButton 
              tooltip={item.title}
              onClick={() => router.push(`/${structureId}/${item.url}`)}
              disabled={pathname === `/${structureId}/${item.url}`}
              isActive={pathname === `/${structureId}/${item.url}`}
              variant={pathname === `/${structureId}/${item.url}` ? "outline" : "default"}
              className={clsx("disabled:font-bold  disabled:text-black disabled:text", item.className)}>
                <item.icon />
                <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
