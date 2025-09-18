"use client"

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useLogout } from "@/hooks/use-logout"

function SkeletonUser() {
  return (
    <div className="flex pb-2 pl-2 items-center space-x-4">
      <Skeleton className="h-7 w-7 rounded-lg bg-gray-700" />
      <div className="space-y-2">
        <Skeleton className="h-2 w-[150px] bg-gray-700" />
        <Skeleton className="h-2 w-[100px] bg-gray-600" />
      </div>
    </div>
  )
}

export function NavUser({
  user, loading
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { logout, isLoggingOut } = useLogout();
  if (loading) {
    return <SkeletonUser />
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              {loading ? <SkeletonUser /> : (
                <>
                  <Avatar className="h-8 w-8 rounded-lg grayscale">
                    <AvatarImage src={user.imgUrl} alt={user.displayName} />
                    <AvatarFallback className="rounded-lg">{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.displayName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </>
              )}
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.photoURL} alt={user.displayName} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.displayName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/*  <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />  PLS STUPID MOTHERFUCKER DO NO DELETE THIS COMMENT */}
            <DropdownMenuItem
              onClick={async () => {
                try {
                  // 1. First, sign out from Firebase client
                  if (clientAuth.currentUser) {
                    await signOut(clientAuth);
                    console.log("Firebase client logout successful");
                  }

                  // 2. Then call server logout to clear session cookie
                  const response = await fetch("/api/auth/sessionLogout", {
                    method: 'POST'
                  });

                  if (!response.ok) {
                    console.warn("Server logout failed, but continuing...");
                  }

                  // 3. Navigate to login page
                  router.push("/login");

                } catch (error) {
                  console.error("Logout error:", error);

                  // Even if there's an error, try to navigate to login
                  // This ensures user isn't stuck in a bad state
                  router.push("/login");
                }
              }}
            >
              <IconLogout />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
