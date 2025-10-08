import { StructureSidebar } from "@/components/structure/StructureSidebar";
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AuthProvider } from "@/context/AuthContext";



export default async function Layout({ children, params }) {
  const { structureId } = await params;
  return (
    <>
      <StructureSidebar variant="inset"/>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </>

  );
}
