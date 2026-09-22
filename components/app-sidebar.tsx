"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FiChevronRight } from "react-icons/fi"
import type { ComponentType, ReactNode } from "react"

import { useAuth } from "@/components/auth-provider"
import { useAgent } from "@/components/agent/agent-context"
import { BrandLockup } from "@/components/brand-lockup"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

// On mobile the sidebar is a slide-over sheet, so nav rows need finger-sized
// hit areas. max-md: keeps the desktop rail untouched.
const mobileNavButton =
  "surface-nav h-7 max-md:h-10 max-md:gap-2.5 max-md:px-2.5 [&>svg]:max-md:size-4"
const mobileNavSubButton =
  "surface-nav max-md:h-9 max-md:gap-2.5 max-md:px-2.5 [&>svg]:max-md:size-4"

export type NavLink = {
  label: string
  /** Optional section label displayed before this navigation item. */
  sectionLabel?: string
  href: string
  icon: ComponentType<{ className?: string }>
  /** Admin destinations remain visible to admins while previewing another account. */
  adminOnly?: boolean
  superAdminOnly?: boolean
  /** Opens the shared Ngai panel instead of navigating to a duplicate page. */
  opensAgent?: boolean
  /** When present the item is a collapsible dropdown and href is only its default destination. */
  items?: Array<{ label: string; href: string; icon: ComponentType<{ className?: string }>; adminOnly?: boolean }>
}

function isActive(pathname: string, href: string, rootHref: string) {
  return href === rootHref ? pathname === rootHref : pathname.startsWith(href)
}

export function AppSidebar({
  navLinks,
  rootHref,
  subtitle,
  navExtra,
  brandName,
  brandLogoUrl,
  className,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navLinks: NavLink[]
  rootHref: string
  subtitle?: string
  navExtra?: ReactNode
  brandName?: string
  brandLogoUrl?: string
}) {
  const pathname = usePathname()
  const { isImpersonating, stopViewingAs } = useAuth()
  const { open: agentOpen, setOpen: setAgentOpen } = useAgent()
  const { isMobile, setOpenMobile } = useSidebar()

  // Tapping a destination on mobile should dismiss the slide-over sheet.
  function handleNavigate(adminOnly = false, opensAgent = false) {
    // Admin tools open in the signed-in account; client pages keep the preview.
    if (adminOnly && isImpersonating) stopViewingAs()
    if (opensAgent) setAgentOpen(true)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "bg-background text-muted-foreground group-data-[side=left]:border-r-0 [&_[data-slot=sidebar-inner]]:bg-background",
        className,
      )}
      {...props}
    >
      <div className="group/sidebar m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-card text-muted-foreground group-data-[collapsible=icon]:m-1 group-data-[collapsible=icon]:rounded-[12px]">
        <SidebarHeader className="group-data-[collapsible=icon]:p-1">
          <div className="flex h-12 items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link href={rootHref}>
                    <BrandLockup logoSize={24} gapClassName="gap-1" brandName={brandName} logoUrl={brandLogoUrl} />
                    {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarTrigger className="size-8 shrink-0 opacity-0 transition-opacity group-hover/sidebar:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:p-1">
            <SidebarMenu className="gap-0.5">
              {navLinks.map((link) => (
                <React.Fragment key={link.href}>
                  {link.sectionLabel && (
                    <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                      <p className="surface-section-label px-2 pb-0.5 pt-2.5">{link.sectionLabel}</p>
                    </SidebarMenuItem>
                  )}
                {link.items ? (
                  <Collapsible
                    key={link.label}
                    asChild
                    defaultOpen={link.items.some((item) => isActive(pathname, item.href, rootHref))}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={link.label} className={mobileNavButton}>
                          <link.icon className="h-4 w-4" />
                          <span>{link.label}</span>
                          {React.createElement(FiChevronRight, { className: "ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" })}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {link.items.map((item) => (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={isActive(pathname, item.href, rootHref)} className={mobileNavSubButton}>
                                <Link href={item.href} onClick={() => handleNavigate(item.adminOnly)}>
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={link.href}>
                    {link.opensAgent ? (
                      <SidebarMenuButton
                        type="button"
                        isActive={agentOpen}
                        tooltip={link.label}
                        className={mobileNavButton}
                        onClick={() => handleNavigate(link.adminOnly, true)}
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive(pathname, link.href, rootHref)} tooltip={link.label} className={mobileNavButton}>
                        <Link href={link.href} onClick={() => handleNavigate(link.adminOnly)}>
                          <link.icon className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )}
                </React.Fragment>
              ))}
            </SidebarMenu>
            {navExtra && <div className="mt-2 group-data-[collapsible=icon]:hidden">{navExtra}</div>}
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:p-1">
          <NavUser />
        </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}
