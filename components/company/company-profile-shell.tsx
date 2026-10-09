"use client"

import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from "react"
import Link from "next/link"
import { Bell, Building2, ChevronRight, LogIn, Search } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiWidget } from "@/components/company/ngai-widget"
import { HeaderTeam } from "@/components/company/header-team"
import { NavUser } from "@/components/nav-user"
import { GlobalSearchDialog, useSearchHotkey, type SearchResult } from "@/components/search/global-search"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function CompanySidebarLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const { setOpenMobile } = useSidebar()

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event)
        setOpenMobile(false)
      }}
    />
  )
}

function CompanyIdentity() {
  const { company } = useCompanyPage()
  return (
    <div className="flex h-12 min-w-0 flex-1 items-center overflow-hidden">
      {company.logoUrl ? (
        <BrandLockup
          logoSize={20}
          wordmarkScale={0.9}
          gapClassName="gap-1"
          className="min-w-0"
          textClassName="truncate"
          brandName={company.name}
          logoUrl={company.logoUrl}
        />
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1 text-foreground">
          <span className="grid size-5 shrink-0 place-items-center text-xs font-semibold">{company.name.trim().charAt(0).toUpperCase() || "?"}</span>
          <span className="truncate text-lg">{company.name}</span>
        </span>
      )}
    </div>
  )
}

const AGENCY_GROUP = { label: "Agency", keys: ["projects", "tasks", "messages"] as string[] }

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
  const { company, people, canManageTeam, absoluteUrl, sections, section, sectionHref, projects, invoices, contracts, estimates, documents } = useCompanyPage()
  const sectionLabel = sections.find((item) => item.key === section)?.label
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)

  const searchResults = useMemo<SearchResult[]>(() => [
    ...sections.map((item) => ({ id: `section-${item.key}`, group: "Pages", label: item.label, href: sectionHref(item.key) })),
    ...projects.map((project) => ({ id: `project-${project.id}`, group: "Jobs", label: project.title, sublabel: project.service || undefined, href: sectionHref("projects") })),
    ...documents.map((doc) => ({ id: `document-${doc.id}`, group: "Documents", label: doc.title || "Document", href: sectionHref("drive", { doc: `document:${doc.id}` }) })),
    ...invoices.map((invoice) => ({ id: `invoice-${invoice.id}`, group: "Finance", label: invoice.invoiceNumber || invoice.title || "Invoice", href: sectionHref("finance", { doc: `invoice:${invoice.id}` }) })),
    ...estimates.map((estimate) => ({ id: `estimate-${estimate.id}`, group: "Finance", label: estimate.estimateNumber || estimate.title || "Estimate", href: sectionHref("finance", { doc: `estimate:${estimate.id}` }) })),
    ...contracts.map((contract) => ({ id: `contract-${contract.id}`, group: "Finance", label: contract.title || "Contract", href: sectionHref("finance", { doc: `contract:${contract.id}` }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sections, projects, documents, invoices, estimates, contracts])

  // Jobs, Tasks and Messages sit together under one Agency dropdown, where the first of them falls.
  type SectionItem = (typeof sections)[number]
  const entries: Array<{ type: "item"; item: SectionItem } | { type: "group"; items: SectionItem[] }> = []
  for (const item of sections) {
    if (!AGENCY_GROUP.keys.includes(item.key)) entries.push({ type: "item", item })
    else {
      const group = entries.find((entry) => entry.type === "group")
      if (group && group.type === "group") group.items.push(item)
      else entries.push({ type: "group", items: [item] })
    }
  }

  function renderItem(item: SectionItem) {
    const Icon = item.icon
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          asChild
          isActive={section === item.key}
          tooltip={item.label}
          className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
        >
          <CompanySidebarLink href={sectionHref(item.key)}>
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            <span className="sidebar-nav-label">{item.label}</span>
          </CompanySidebarLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <div className="dashboard-body flex h-svh flex-col overflow-hidden bg-background font-sans [&_*]:font-sans">
      <SidebarProvider className="!min-h-0 flex-1">
        <Sidebar collapsible="icon" className="dashboard-sidebar bg-sidebar text-foreground group-data-[side=left]:!border-r-0 print:hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
            <SidebarHeader className="group-data-[collapsible=icon]:p-1">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <CompanyIdentity />
                </div>
                <SidebarTrigger className="size-8 shrink-0" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="group-data-[collapsible=icon]:p-1">
                <SidebarMenu className="gap-0.5 max-md:gap-1.5">
                  {entries.map((entry) => {
                    if (entry.type === "item") return renderItem(entry.item)
                    const open = entry.items.some((item) => item.key === section)
                    return (
                      <Collapsible key="agency-group" asChild defaultOpen={open} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={AGENCY_GROUP.label} className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5">
                              <Building2 className="h-4 w-4" aria-hidden="true" />
                              <span className="sidebar-nav-label">{AGENCY_GROUP.label}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" aria-hidden="true" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="gap-0.5">
                              {entry.items.map((item) => {
                                const Icon = item.icon
                                return (
                                  <SidebarMenuSubItem key={item.key}>
                                    <SidebarMenuSubButton asChild isActive={section === item.key} className="h-9 gap-2 px-2 max-md:h-11 max-md:min-h-11 max-md:gap-3 max-md:px-3">
                                      <CompanySidebarLink href={sectionHref(item.key)}>
                                        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                                        <span className="sidebar-nav-label">{item.label}</span>
                                      </CompanySidebarLink>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
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
        <SidebarInset className="min-h-0 overflow-y-auto bg-card md:!m-0 md:!rounded-none md:bg-background md:!shadow-none">
          <header className="surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-card px-4 text-foreground max-md:border-b max-md:border-border md:h-[72px] md:bg-background md:px-7 print:hidden">
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 max-md:data-[orientation=vertical]:h-6" />
            </div>
            <div className="flex min-w-0 items-center gap-1 md:gap-3">
              <div className="relative hidden w-64 shrink-0 md:block lg:w-72">
                <button type="button" onClick={openSearch} className="flex h-12 w-full items-center gap-2 rounded-full bg-sidebar-accent/25 px-4 text-left text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Search ${company.name}`}>
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Search {company.name}</span>
                </button>
              </div>
              <h1 className="surface-title min-w-0 truncate max-md:[--surface-title-size:17px] md:sr-only">{sectionLabel ?? company.name}</h1>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50 md:hidden" aria-label={`Search ${company.name}`} onClick={openSearch}>
                <Search className="size-[18px]" aria-hidden="true" />
              </Button>
              <HeaderTeam
                company={company}
                people={people}
                canManageTeam={canManageTeam}
                shareUrl={absoluteUrl(`/${encodeURIComponent(company.slug || company.id)}`)}
              />
              <Button type="button" variant="ghost" size="icon" className="hidden rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50 sm:inline-flex" aria-label="Notifications">
                <Bell className="size-[18px]" aria-hidden="true" />
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 bg-card px-4 pb-16 pt-4 sm:px-6 sm:pt-6 md:m-3 md:mt-0 md:rounded-2xl md:pb-6 md:shadow-[0_6px_24px_rgba(15,23,42,0.04)] lg:px-8">
            {section !== "about" && sectionLabel && (
              <div className="mb-0.5 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-[18px] tracking-[-0.02em] text-foreground max-md:hidden md:text-[23px]">{sectionLabel}</h2>
                {/* Pages portal their own action buttons here, opposite the title. */}
                <div id="company-title-actions" className="ml-auto flex shrink-0 items-center gap-2" />
              </div>
            )}
            {children}
          </main>
        </SidebarInset>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} results={searchResults} placeholder={`Search ${company.name}…`} />

        <NgaiWidget />
      </SidebarProvider>
    </div>
  )
}
