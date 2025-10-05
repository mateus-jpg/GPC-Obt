"use client"

import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button"
import clsx from "clsx";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link";
import { useRouter } from "next/navigation";
export function NavMain({
  structureId,
  items
}) {

  if (!structureId){
    structureId = ""
  }
  const router = useRouter()
  const pathname = usePathname();
  console.log("Structure ID in NavMain:", structureId);
  console.log("current path:", pathname);
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">

            <SidebarMenuButton
              tooltip="Quick Create"
              onClick={() => router.push(`/${structureId}/new`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear">
              <IconCirclePlusFilled />
              <span>Nuovo Accesso</span>
            </SidebarMenuButton>

            
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} onClick={() => router.push(`${structureId}/${item.url}`)} disabled={pathname === `/${structureId}/${item.url}`} 

              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
