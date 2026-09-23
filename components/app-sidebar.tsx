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
  "surface-nav h-6 max-md:h-8 max-md:gap-2 max-md:px-2 [&>svg]:max-md:size-4 max-md:[&>.sidebar-nav-label]:!text-[13px] max-md:[&>.sidebar-nav-label]:!leading-5"
const mobileNavSubButton =
  "surface-nav h-6 max-md:h-7 max-md:gap-2 max-md:px-2 [&>svg]:max-md:size-4 max-md:[&>.sidebar-nav-label]:!text-[13px] max-md:[&>.sidebar-nav-label]:!leading-5"

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
  const router = useRouter()
  const { isImpersonating, stopViewingAs } = useAuth()
  const { open: agentOpen, setOpen: setAgentOpen, conversations, activeConversationId, reset, selectConversation } = useAgent()
  const { isMobile, setOpenMobile } = useSidebar()
  const brandHref = isMobile ? "/dashboard/agent" : rootHref

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
                  <Link href={brandHref} onClick={() => handleNavigate()}>
                    <BrandLockup logoSize={20} wordmarkScale={0.9} gapClassName="gap-1" brandName={brandName} logoUrl={brandLogoUrl} />
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
            <SidebarMenu className="gap-1 max-md:gap-0.5">
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
                          <span className="sidebar-nav-label">{link.label}</span>
                          <ReactIcon icon={FiChevronRight} className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
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
                        <Link href={link.href} onClick={() => handleNavigate(link.adminOnly)}>
                          <link.icon className="h-4 w-4" />
                          <span className="sidebar-nav-label">{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )}
                </React.Fragment>
              ))}
            </SidebarMenu>
            {conversations.length > 0 && (
              <div className="mt-3 border-t border-border pt-3 max-md:mt-2 max-md:pt-2 group-data-[collapsible=icon]:hidden">
                <p className="surface-section-label px-2 pb-1.5">Recents</p>
                <SidebarMenu className="gap-1 max-md:gap-0.5">
                  {conversations.slice(0, isMobile ? 3 : 5).map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        type="button"
                        tooltip={conversation.title}
                        isActive={conversation.id === activeConversationId}
                        className="surface-nav sidebar-recent-button h-6 px-2 max-md:h-7 max-md:[&>.sidebar-recent-label]:!text-[13px] max-md:[&>.sidebar-recent-label]:!leading-5"
                        onClick={() => {
                          selectConversation(conversation.id)
                          handleNavigate(false)
                          router.push(`/dashboard/agent/${encodeURIComponent(conversation.id)}`)
                        }}
                      >
                        <span className="sidebar-recent-label truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            )}
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
