"use client"

import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LogIn, Search, Settings, Sparkles } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiCompanyHeaderButton, NgaiWidget } from "@/components/company/ngai-widget"
import { AppSwitcher } from "@/components/dashboard/app-switcher"
import { useSubscription } from "@/components/company/company-plan"
import { UpgradeModal } from "@/components/company/upgrade-modal"
import { HeaderTeam } from "@/components/company/header-team"
import { useTeamSeats } from "@/components/company/team-seats"
import { NavUser } from "@/components/nav-user"
import { GlobalSearchDialog, useSearchHotkey, type SearchResult } from "@/components/search/global-search"
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

/** Opens the plans in a modal for the people who manage the team. */
function UpgradeNavItem() {
  const { company, canManageTeam } = useCompanyPage()
  const { setOpenMobile } = useSidebar()
  const billing = useSubscription(company.id)
  const teamSeats = useTeamSeats(company.id, canManageTeam)
  const [open, setOpen] = useState(false)

  if (!canManageTeam) return null

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        tooltip="Upgrade"
        onClick={() => { setOpenMobile(false); setOpen(true) }}
        className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="sidebar-nav-label">Upgrade</span>
      </SidebarMenuButton>
      <UpgradeModal open={open} onOpenChange={setOpen} companyId={company.id} companyName={company.name} billing={billing} seats={teamSeats.info?.seats ?? null} />
    </SidebarMenuItem>
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
  const { company, people, canManageTeam, absoluteUrl, sections, section, sectionHref, projects, invoices, contracts, estimates, documents, recordOpen } = useCompanyPage()
  const pathname = usePathname()
  const isSettingsPage = pathname.split("/").filter(Boolean)[1] === "settings"
  const sectionLabel = sections.find((item) => item.key === section)?.label
  const pageLabel = isSettingsPage ? "Settings" : sectionLabel
  const settingsHref = `/${encodeURIComponent(company.slug || company.id)}/settings`
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)

  const searchResults = useMemo<SearchResult[]>(() => [
    ...sections.map((item) => ({ id: `section-${item.key}`, group: "Pages", label: item.label, href: sectionHref(item.key) })),
    ...projects.map((project) => ({ id: `project-${project.id}`, group: "Campaigns", label: project.title, sublabel: project.service || undefined, href: sectionHref("projects") })),
    ...documents.map((doc) => ({ id: `document-${doc.id}`, group: "Documents", label: doc.title || "Document", href: sectionHref("drive", { doc: `document:${doc.id}` }) })),
    ...invoices.map((invoice) => ({ id: `invoice-${invoice.id}`, group: "Payments", label: invoice.invoiceNumber || invoice.title || "Invoice", href: sectionHref("finance", { doc: `invoice:${invoice.id}` }) })),
    ...estimates.map((estimate) => ({ id: `estimate-${estimate.id}`, group: "Payments", label: estimate.estimateNumber || estimate.title || "Estimate", href: sectionHref("finance", { doc: `estimate:${estimate.id}` }) })),
    ...contracts.map((contract) => ({ id: `contract-${contract.id}`, group: "Payments", label: contract.title || "Contract", href: sectionHref("finance", { doc: `contract:${contract.id}` }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sections, projects, documents, invoices, estimates, contracts])

  type SectionItem = (typeof sections)[number]
  const sidebarSections = sections.filter((item) => item.key !== "activity")

  function renderItem(item: SectionItem) {
    const Icon = item.icon
    const isActive = !isSettingsPage && section === item.key
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.label}
          className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
        >
          <CompanySidebarLink href={sectionHref(item.key)}>
            {item.key === "ngai" ? (
              <Image src="/ngai-logo.png" alt="" width={18} height={18} className="size-[18px] shrink-0 rounded-full max-md:size-5" />
            ) : Icon ? (
              <Icon className="h-4 w-4" aria-hidden="true" />
            ) : null}
            <span className="sidebar-nav-label">{item.label}</span>
            {item.key === "projects" && (
              <span className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold tabular-nums text-primary-foreground group-data-[collapsible=icon]:hidden">
                {projects.length}
              </span>
            )}
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
                  {sidebarSections.map(renderItem)}
                  <UpgradeNavItem />
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
              <h1 className="surface-title min-w-0 truncate max-md:[--surface-title-size:17px] md:sr-only">{pageLabel ?? company.name}</h1>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
              <Button type="button" variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50 md:hidden" aria-label={`Search ${company.name}`} onClick={openSearch}>
                <Search className="size-[18px]" aria-hidden="true" />
              </Button>
              <HeaderTeam
                company={company}
                people={people}
                canManageTeam={canManageTeam}
                shareUrl={absoluteUrl(`/${encodeURIComponent(company.slug || company.id)}`)}
              />
              <AppSwitcher />
              <NgaiCompanyHeaderButton />
              <Button asChild variant="ghost" size="icon" className={cn("rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50", isSettingsPage && "bg-muted/50")}>
                <Link href={settingsHref} aria-label="Settings" title="Settings" aria-current={isSettingsPage ? "page" : undefined}>
                  <Settings className="size-[18px]" aria-hidden="true" />
                </Link>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="hidden rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50 sm:inline-flex" aria-label="Notifications">
                <Bell className="size-[18px]" aria-hidden="true" />
              </Button>
            </div>
          </header>
          <main className={cn(
            "min-w-0 flex-1 bg-card px-3 sm:px-6 md:m-3 md:mt-0 md:rounded-2xl md:shadow-[0_6px_24px_rgba(15,23,42,0.04)] lg:px-8",
            // Ngai sits its composer near the bottom edge; other pages keep room below.
            section === "ngai" ? "pb-1 md:pb-1" : "pb-16 md:pb-6",
            recordOpen ? "pt-2 sm:pt-3" : "pt-1 sm:pt-6",
          )}>
            {(isSettingsPage || section !== "about") && pageLabel && !recordOpen && (
              <div className="mb-0.5 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-[18px] tracking-[-0.02em] text-foreground max-md:hidden md:text-[23px]">{pageLabel}</h2>
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
