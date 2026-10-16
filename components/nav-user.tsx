"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { ChevronsUpDown, LogOut, Moon, UserCog } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { userRoleLabel } from "@/lib/users"
import { Switch } from "@/components/ui/switch"
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

export function NavUser({ variant = "sidebar", accountLabel = "Account", accountHref = "/dashboard/account" }: { variant?: "sidebar" | "header"; accountLabel?: string; accountHref?: string }) {
  const { isMobile } = useSidebar()
  const { user, appUser, isViewingAs, signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)

  const name = appUser?.displayName || appUser?.company || user?.displayName || "Account"
  const email = appUser?.email || user?.email || ""
  const role = userRoleLabel(appUser?.role)
  const photoURL = appUser?.photoURL || user?.photoURL
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  useEffect(() => {
    setThemeReady(true)
  }, [])

  const menu = (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            {photoURL && <AvatarImage src={photoURL} alt={name} referrerPolicy="no-referrer" />}
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs">{email}</span>
            <span className="truncate text-xs text-muted-foreground">{role}</span>
            {isViewingAs && <span className="truncate text-[10px] text-amber-700">Viewing as {appUser?.role === "client" ? "client" : "admin"}</span>}
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={accountHref}>
          <UserCog />
          {accountLabel}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
        <Moon />
        <span className="flex-1">Dark mode</span>
        <Switch
          checked={themeReady && resolvedTheme === "dark"}
          onCheckedChange={(enabled) => setTheme(enabled ? "dark" : "light")}
          disabled={!themeReady}
          aria-label="Dark mode"
          onClick={(event) => event.stopPropagation()}
        />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={signOut}>
        <LogOut />
        Log out
      </DropdownMenuItem>
    </>
  )

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full p-0 text-foreground hover:bg-muted/50" aria-label="Open profile menu" title={name}>
            <Avatar className="size-8 rounded-full">
              {photoURL && <AvatarImage src={photoURL} alt={name} referrerPolicy="no-referrer" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="min-w-56 rounded-lg">
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    )
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
              <Avatar className="h-8 w-8 rounded-lg">
                {photoURL && <AvatarImage src={photoURL} alt={name} referrerPolicy="no-referrer" />}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-[14px] font-medium leading-5 text-muted-foreground">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-[13px] leading-4">{role}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
