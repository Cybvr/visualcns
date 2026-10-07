"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FiChevronRight } from "react-icons/fi"
import type { ComponentType, ReactNode } from "react"

import { useAuth } from "@/components/auth-provider"
import { useAgent } from "@/components/agent/agent-context"
import { BrandLockup } from "@/components/brand-lockup"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"
import { ReactIcon } from "@/components/react-icon"
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
  "h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
const mobileNavSubButton =
  "h-9 gap-2 px-2 max-md:h-11 max-md:min-h-11 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"

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
  /** Clears the current conversation before opening the full Agent page. */
  startsNewChat?: boolean
  /** When present the item is a collapsible dropdown and href is only its default destination. */
  items?: Array<{ label: string; href: string; icon: ComponentType<{ className?: string }>; adminOnly?: boolean }>
}

function isActive(pathname: string, href: string, rootHref: string) {
  return href === rootHref ? pathname === rootHref : pathname.startsWith(href)
}

export function AppSidebar({
  navLinks,
  rootHref,
  navExtra,
  brandName,
  brandLogoUrl,
  unreadEmailCount = 0,
  className,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navLinks: NavLink[]
  rootHref: string
  navExtra?: ReactNode
  brandName?: string
  brandLogoUrl?: string
  unreadEmailCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isImpersonating, stopViewingAs } = useAuth()
  const { open: agentOpen, setOpen: setAgentOpen, reset } = useAgent()
  const { isMobile, setOpenMobile } = useSidebar()
  const brandHref = isMobile ? "/dashboard/agent" : rootHref
  const displayedBrandName = brandName?.trim() || "VisualCNS"
  const sidebarLogoUrl = displayedBrandName.toLowerCase() === "visualcns" ? undefined : brandLogoUrl

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
        "dashboard-sidebar bg-sidebar text-foreground group-data-[side=left]:!border-r-0",
        className,
      )}
      {...props}
    >
      <div className="group/sidebar flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
        <SidebarHeader className="group-data-[collapsible=icon]:p-1">
          <div className="flex h-12 items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Link
              href={brandHref}
              onClick={() => handleNavigate()}
              className="flex min-w-0 flex-1 items-center overflow-hidden text-foreground outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
            >
              <BrandLockup logoSize={20} wordmarkScale={0.9} gapClassName="gap-1" brandName={displayedBrandName} logoUrl={sidebarLogoUrl} />
            </Link>
            <SidebarTrigger className="size-8 shrink-0" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:p-1">
              <SidebarMenu className="gap-0.5 max-md:gap-1.5">
              {navLinks.map((link) => (
                <React.Fragment key={link.href}>
                  {link.sectionLabel && (
                    <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                      <p className="surface-section-label px-2 pb-0.5 pt-3">{link.sectionLabel}</p>
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
                          <span className="sidebar-nav-label">{link.label}</span>
                          <ReactIcon icon={FiChevronRight} className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="gap-0.5">
                          {link.items.map((item) => (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={isActive(pathname, item.href, rootHref)} className={mobileNavSubButton}>
                                <Link href={item.href} onClick={() => handleNavigate(item.adminOnly)}>
                                  <item.icon className="h-4 w-4" />
                                  <span className="sidebar-nav-label">{item.label}</span>
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
                    {link.startsNewChat ? (
                      <SidebarMenuButton
                        type="button"
                        isActive={isActive(pathname, link.href, rootHref)}
                        tooltip={link.label}
                        className={mobileNavButton}
                        onClick={() => {
                          reset()
                          handleNavigate(link.adminOnly)
                          if (pathname !== link.href) router.push(link.href)
                        }}
                      >
                        <link.icon className="h-4 w-4" />
                        <span className="sidebar-nav-label">{link.label}</span>
                      </SidebarMenuButton>
                    ) : link.opensAgent ? (
                      <SidebarMenuButton
                        type="button"
                        isActive={agentOpen}
                        tooltip={link.label}
                        className={mobileNavButton}
                        onClick={() => handleNavigate(link.adminOnly, true)}
                      >
                        <link.icon className="h-4 w-4" />
                        <span className="sidebar-nav-label">{link.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive(pathname, link.href, rootHref)} tooltip={link.label} className={mobileNavButton}>
                        <Link href={link.href} onClick={() => handleNavigate(link.adminOnly)} className={link.href === "/dashboard/email" ? "relative" : undefined} aria-label={link.href === "/dashboard/email" && unreadEmailCount > 0 ? `${link.label}, ${unreadEmailCount} unread` : undefined}>
                          <link.icon className="h-4 w-4" />
                          <span className={cn("sidebar-nav-label", link.href === "/dashboard/email" && unreadEmailCount > 0 && "font-semibold")}>{link.label}</span>
                          {link.href === "/dashboard/email" && unreadEmailCount > 0 && (
                            <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums text-primary-foreground group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-right-1 group-data-[collapsible=icon]:-top-1" aria-hidden="true">
                              {unreadEmailCount > 99 ? "99+" : unreadEmailCount}
                            </span>
                          )}
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
