"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { LogIn } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiWidget } from "@/components/company/ngai-widget"
import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/** `expanded` shows the name and handle at every width, for the phone drawer. */
function CompanyIdentity({ expanded = false }: { expanded?: boolean }) {
  const { company } = useCompanyPage()
  return (
    <div className={cn("mb-4 flex items-center gap-3", expanded ? "px-2" : "justify-center lg:justify-start lg:px-2")}>
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white">
        {company.logoUrl ? (
          // Company logos can be hosted outside the configured image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={`${company.name} logo`} className="size-8 object-contain" />
        ) : (
          <span className="text-lg font-semibold text-muted-foreground">{company.name.trim().charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>
      <div className={cn("min-w-0", !expanded && "hidden lg:block")}>
        <div data-weight="bold" className="truncate text-[19px] leading-tight tracking-[-0.02em] text-foreground">{company.name}</div>
        {company.slug && <div className="mt-0.5 truncate text-sm font-semibold text-foreground">@{company.slug}</div>}
      </div>
    </div>
  )
}

/** The dashboard's account menu when signed in, a sign-in button for visitors. */
function SidebarAccount() {
  const { company } = useCompanyPage()
  const { user } = useAuth()

  if (user) return <NavUser />
  if (!company.slug) return null
  return (
    <Button asChild className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
      <Link href={`/${encodeURIComponent(company.slug)}/sign-in`} aria-label="Sign in">
        <LogIn className="hidden size-4 group-data-[collapsible=icon]:block" aria-hidden="true" />
        <span className="group-data-[collapsible=icon]:hidden">Sign in</span>
      </Link>
    </Button>
  )
}


/**
 * The public company page frame, built from the same pieces as the dashboard
 * shell: SidebarProvider + Sidebar + SidebarInset, with the content in the white
 * card on the tinted background and the page header inside the card.
 */
export function CompanyProfileShell({ children }: { children: ReactNode }) {
  const { company, sections, section, sectionHref } = useCompanyPage()
  const sectionLabel = sections.find((item) => item.key === section)?.label

  return (
    <div className="dashboard-body flex h-svh flex-col overflow-hidden bg-background font-sans [&_*]:font-sans">
      <SidebarProvider className="!min-h-0 flex-1">
        <Sidebar collapsible="icon" className="dashboard-sidebar bg-sidebar text-foreground group-data-[side=left]:!border-r-0 print:hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
            <SidebarHeader className="group-data-[collapsible=icon]:p-1">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <CompanyIdentity expanded />
                </div>
                <SidebarTrigger className="size-8 shrink-0" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="group-data-[collapsible=icon]:p-1">
                <SidebarMenu className="gap-0.5 max-md:gap-1.5">
                  {sections.map((item) => {
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          asChild
                          isActive={section === item.key}
                          tooltip={item.label}
                          className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
                        >
                          <Link href={sectionHref(item.key)}>
                            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                            <span className="sidebar-nav-label">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="group-data-[collapsible=icon]:p-1">
              <SidebarAccount />
            </SidebarFooter>
          </div>
          <SidebarRail />
        </Sidebar>

        {/* The inset itself is the full-height scroller, flush to the window's right edge,
            so its scrollbar is the window's. The header sits on the tinted background and
            sticky strips in that colour hide content passing the card's edges. */}
        <SidebarInset className="min-h-0 overflow-y-auto bg-card md:bg-sidebar">
          <header className="surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-card px-4 text-foreground max-md:border-b max-md:border-border md:bg-sidebar print:hidden md:after:pointer-events-none md:after:absolute md:after:left-0 md:after:top-full md:after:size-4 md:after:bg-[radial-gradient(circle_at_100%_100%,transparent_15.5px,var(--sidebar)_16px)]">
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 max-md:data-[orientation=vertical]:h-6" />
            </div>
            <h1 className="surface-title min-w-0 truncate max-md:[--surface-title-size:17px]">{sectionLabel ?? company.name}</h1>
          </header>
          <main className="min-w-0 flex-1 bg-card px-4 pb-16 pt-4 sm:px-6 sm:pt-6 md:rounded-tl-2xl lg:px-8">
            {children}
          </main>
          <div
            aria-hidden="true"
            className="pointer-events-none sticky bottom-0 z-40 hidden h-3 shrink-0 bg-sidebar after:absolute after:bottom-full after:left-0 after:size-4 after:bg-[radial-gradient(circle_at_100%_0%,transparent_15.5px,var(--sidebar)_16px)] print:hidden md:block"
          />
        </SidebarInset>

        <NgaiWidget />
      </SidebarProvider>
    </div>
  )
}
