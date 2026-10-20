"use client"

import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn, Search } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiWidget } from "@/components/company/ngai-widget"
import { ItemActionsProvider } from "@/components/dashboard/item-menu"
import { SidebarTakeoverMenu, SidebarTakeoverProvider } from "@/components/company/sidebar-takeover"
import { CartButton } from "@/components/dashboard/cart-button"
import { NotificationsButton } from "@/components/dashboard/notifications-button"
import { buildActivity, type ActivityItem } from "@/lib/activity"
import { UpgradeCard } from "@/components/company/upgrade-card"
import { NavUser } from "@/components/nav-user"
import { GlobalSearchDialog, useSearchHotkey, type SearchResult } from "@/components/search/global-search"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { invoiceIsOverdue } from "@/lib/invoice-reminders"
import {
  Sidebar,
  SidebarContent,
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

/** The dashboard's account menu when signed in, a sign-in button for visitors. */
function SidebarAccount({ header = false }: { header?: boolean }) {
  const { company } = useCompanyPage()
  const { user } = useAuth()

  // On a company page, My Account opens that company's own account page rather than the dashboard's.
  if (user) return <NavUser variant={header ? "header" : "sidebar"} accountLabel="My Account" accountHref={`/${encodeURIComponent(company.slug || company.id)}/settings/account`} />
  if (!company.slug) return null
  return (
    <Button asChild className={header ? "h-9" : "w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"}>
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
  const { company, sections, section, sectionHref, projects, tasks, invoices, contracts, estimates, documents, recordOpen } = useCompanyPage()
  const { user } = useAuth()
  const pathname = usePathname()
  const pageSegment = pathname.split("/").filter(Boolean)[1]
  const settingsSubpage = pathname.split("/").filter(Boolean)[2]
  const isSettingsPage = pageSegment === "settings"
  const isCheckoutPage = pageSegment === "checkout"
  const isServicesPage = pageSegment === "services"
  const isCartPage = pageSegment === "cart"
  const sectionLabel = sections.find((item) => item.key === section)?.label
  const settingsPageLabel = settingsSubpage === "account" ? "Account" : settingsSubpage === "social" ? "Social" : settingsSubpage === "reports" ? "Reports" : settingsSubpage === "analytics" ? "Analytics" : "General"
  const pageLabel = isSettingsPage ? settingsPageLabel : isCheckoutPage ? "Checkout" : isServicesPage ? "Services" : isCartPage ? "Cart" : sectionLabel
  const companyPath = `/${encodeURIComponent(company.slug || company.id)}`
  const activity = useMemo(() => buildActivity({ projects, tasks, invoices, estimates, contracts, documents }, 20), [projects, tasks, invoices, estimates, contracts, documents])
  const activityHref = useCallback((item: ActivityItem) => {
    if (item.kind === "task") return sectionHref("projects", { task: item.refId })
    if (item.kind === "project") return sectionHref("projects")
    if (item.kind === "file") return undefined
    return sectionHref("documents", { doc: `${item.kind}:${item.refId}` })
  }, [sectionHref])
  const overdueInvoiceCount = invoices.filter((invoice) => invoiceIsOverdue(invoice)).length
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchHotkey(openSearch)

  const searchResults = useMemo<SearchResult[]>(() => [
    ...sections.map((item) => ({ id: `section-${item.key}`, group: "Pages", label: item.label, href: sectionHref(item.key) })),
    ...projects.map((project) => ({ id: `project-${project.id}`, group: "Campaigns", label: project.title, sublabel: project.service || undefined, href: sectionHref("projects") })),
    ...documents.map((doc) => ({ id: `document-${doc.id}`, group: "Documents", label: doc.title || "Document", href: sectionHref("documents", { doc: `document:${doc.id}` }) })),
    ...invoices.map((invoice) => ({ id: `invoice-${invoice.id}`, group: "Documents", label: invoice.invoiceNumber || invoice.title || "Invoice", href: sectionHref("documents", { doc: `invoice:${invoice.id}` }) })),
    ...estimates.map((estimate) => ({ id: `estimate-${estimate.id}`, group: "Documents", label: estimate.estimateNumber || estimate.title || "Estimate", href: sectionHref("documents", { doc: `estimate:${estimate.id}` }) })),
    ...contracts.map((contract) => ({ id: `contract-${contract.id}`, group: "Documents", label: contract.title || "Contract", href: sectionHref("documents", { doc: `contract:${contract.id}` }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sections, projects, documents, invoices, estimates, contracts])

  type SectionItem = (typeof sections)[number]
  // Reports and Analytics live under Settings, so they leave the main menu.
  const sidebarSections = sections.filter((item) => !["activity", "pulse", "analytics"].includes(item.key))

  function renderItem(item: SectionItem) {
    const Icon = item.icon
    const isActive = !isSettingsPage && !isCheckoutPage && !isServicesPage && !isCartPage && section === item.key
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
            {item.key === "billings" && overdueInvoiceCount > 0 && (
              <span
                className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-5 tabular-nums text-destructive-foreground group-data-[collapsible=icon]:hidden"
                aria-label={`${overdueInvoiceCount} overdue invoice${overdueInvoiceCount === 1 ? "" : "s"}`}
              >
                {overdueInvoiceCount > 99 ? "99+" : overdueInvoiceCount}
              </span>
            )}
          </CompanySidebarLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarTakeoverProvider>
    <ItemActionsProvider>
    <div className="dashboard-body flex h-svh flex-col overflow-hidden bg-background font-dashboard [&_*]:font-dashboard">
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
                  <SidebarTakeoverMenu sections={<>{sidebarSections.map(renderItem)}</>} />
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <UpgradeCard />
          </div>
          <SidebarRail />
        </Sidebar>

        {/* The inset itself is the full-height scroller, flush to the window's right edge,
            so its scrollbar is the window's. The header sits on the tinted background and
            sticky strips in that colour hide content passing the card's edges. */}
        <SidebarInset className="min-h-0 overflow-y-auto bg-card dark:bg-background [--shell-header-h:3.5rem] md:[--shell-header-h:72px] md:!m-0 md:!rounded-none md:bg-background md:!shadow-none">
          <header className="surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-card dark:bg-background px-4 text-foreground max-md:border-b max-md:border-border md:h-[72px] md:bg-background md:px-7 print:hidden">
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
              {user && (
                <>
                  <CartButton cartHref={`${companyPath}/cart`} servicesHref={`${companyPath}/services`} />
                  <NotificationsButton activity={activity} hrefFor={activityHref} viewAllHref={`${companyPath}/notifications`} />
                </>
              )}
              <SidebarAccount header />
            </div>
          </header>
          {/* Content, then an open document (an artifact) beside it, both under the header like Claude. */}
          <div className="flex min-w-0 flex-1">
            <main className={cn(
              "min-w-0 flex-1 bg-card dark:bg-background px-3 sm:px-6 md:m-3 md:mt-0 md:rounded-2xl md:shadow-[0_6px_24px_rgba(15,23,42,0.04)] lg:px-8",
              // Ngai, as a page or a campaign tab, runs its composer down to the bottom edge; other pages keep room below.
              section === "ngai" ? "pb-1 md:pb-1" : "pb-16 md:pb-6 has-[[data-ngai-page]]:pb-1 md:has-[[data-ngai-page]]:pb-1",
              recordOpen ? "pt-0 sm:pt-0" : "pt-1 sm:pt-6",
            )}>
              {(isSettingsPage || isCheckoutPage || isServicesPage || isCartPage || section !== "about") && pageLabel && !recordOpen && (
                <div className="mb-0.5 flex items-center justify-between gap-3">
                  <h2 className="surface-record-title min-w-0 truncate max-md:hidden">{pageLabel}</h2>
                  {/* Pages portal their own action buttons here, opposite the title. */}
                  <div id="company-title-actions" className="ml-auto flex shrink-0 items-center gap-2" />
                </div>
              )}
              {children}
            </main>
            {/* The open document is portalled here. It stays in view while the content scrolls,
                takes no room when empty, and covers the screen on a phone. */}
            <div
              id="company-artifact-slot"
              className="empty:hidden max-md:fixed max-md:inset-0 max-md:z-50 md:sticky md:top-[var(--shell-header-h,72px)] md:h-[calc(100svh-var(--shell-header-h,72px)-0.75rem)] md:w-[min(48rem,45vw)] md:shrink-0 md:self-start"
            />
          </div>
        </SidebarInset>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} results={searchResults} placeholder={`Search ${company.name}…`} />

        <NgaiWidget />
      </SidebarProvider>
    </div>
    </ItemActionsProvider>
    </SidebarTakeoverProvider>
  )
}
