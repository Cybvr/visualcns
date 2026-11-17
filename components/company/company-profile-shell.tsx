"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BadgeDollarSign, ChevronRight, CreditCard, FileText, Fingerprint, Globe, House, Image as ImageIcon, LayoutTemplate, Lightbulb, Link2, LogIn, Megaphone, Search, Settings2, Share2, Star, Store, Target, Users, Wallet } from "lucide-react"

import { NgaiMark } from "@/components/agent/ngai-mark"
import { useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiWidget } from "@/components/company/ngai-widget"
import { ItemActionsProvider } from "@/components/dashboard/item-menu"
import { SidebarTakeoverMenu, SidebarTakeoverProvider } from "@/components/company/sidebar-takeover"
import { CartButton } from "@/components/dashboard/cart-button"
import { NotificationsButton } from "@/components/dashboard/notifications-button"
import { buildActivity, type ActivityItem } from "@/lib/activity"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type MenuGroupItem = { key: string; label: string; href: string; icon?: ComponentType<{ className?: string }>; count?: number; alert?: number }

/** Icons for the pages under each menu heading. */
const SUBMENU_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "websites-home": House,
  sites: LayoutTemplate,
  domains: Link2,
  marketing: House,
  insights: Lightbulb,
  projects: Target,
  social: Share2,
  assets: ImageIcon,
  seo: Search,
  "business-profile": Store,
  reviews: Star,
  "google-ads": BadgeDollarSign,
  "marketing-settings": Settings2,
  "finance-home": House,
  documents: FileText,
  billings: CreditCard,
  "security-home": House,
  visitors: Users,
}

/** A main menu heading (Websites, Marketing, Finance) that opens to its pages. */
function MenuGroup({ icon: Icon, label, items, active }: {
  icon: ComponentType<{ className?: string }>
  label: string
  items: MenuGroupItem[]
  active: string | null
}) {
  const { state, isMobile } = useSidebar()
  const [open, setOpen] = useState(active !== null)
  useEffect(() => { if (active) setOpen(true) }, [active])
  const collapsed = state === "collapsed" && !isMobile

  return (
    <SidebarMenuItem>
      {collapsed ? (
        <SidebarMenuButton asChild isActive={active !== null} tooltip={label} className="h-9 gap-2 px-2">
          <CompanySidebarLink href={items[0].href}>
            <Icon className="h-4 w-4" />
            <span className="sidebar-nav-label">{label}</span>
          </CompanySidebarLink>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          isActive={active !== null && !open}
          tooltip={label}
          className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
        >
          <Icon className="h-4 w-4" />
          <span className="sidebar-nav-label">{label}</span>
          <ChevronRight className={cn("ml-auto size-4! transition-transform", open && "rotate-90")} aria-hidden="true" />
        </SidebarMenuButton>
      )}
      {open && !collapsed && (
        <SidebarMenuSub>
          {items.map((item) => (
            <SidebarMenuSubItem key={item.key}>
              <SidebarMenuSubButton asChild isActive={active === item.key} className="h-8 max-md:h-11">
                <CompanySidebarLink href={item.href}>
                  {item.icon && <item.icon className="size-4 shrink-0 max-md:size-[18px]" aria-hidden="true" />}
                  <span className="sidebar-nav-label">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold tabular-nums text-primary-foreground">
                      {item.count}
                    </span>
                  )}
                  {Boolean(item.alert) && (
                    <span
                      className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-5 tabular-nums text-destructive-foreground"
                      aria-label={`${item.alert} overdue invoice${item.alert === 1 ? "" : "s"}`}
                    >
                      {item.alert! > 99 ? "99+" : item.alert}
                    </span>
                  )}
                </CompanySidebarLink>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

/** The main menu headings and the pages each one opens to, in menu order. */
const MENU_GROUPS = [
  { key: "websites", label: "Websites", icon: Globe, items: [{ key: "websites-home", label: "Home" }, { key: "sites", label: "Sites" }, { key: "domains", label: "Domains" }] },
  { key: "marketing", label: "Marketing", icon: Megaphone, items: [
    { key: "marketing", label: "Home" },
    { key: "insights", label: "Insights" },
    { key: "projects", label: "Campaigns" },
    { key: "social", label: "Social Media" },
    { key: "assets", label: "Assets" },
    { key: "seo", label: "SEO" },
    { key: "business-profile", label: "Business Profile" },
    { key: "reviews", label: "Reviews" },
    { key: "google-ads", label: "Google Ads" },
    { key: "marketing-settings", label: "Settings" },
  ] },
  { key: "finance", label: "Finance", icon: Wallet, items: [{ key: "finance-home", label: "Home" }, { key: "documents", label: "Documents" }] },
  { key: "security", label: "Security", icon: Fingerprint, items: [{ key: "security-home", label: "Home" }, { key: "visitors", label: "Visitors" }] },
] as const

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
  if (user) return <NavUser variant={header ? "header" : "sidebar"} accountLabel="My Account" accountHref={`/${encodeURIComponent(company.slug || company.id)}/settings/account`} backToDashboard />
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
  const isPricingPage = pageSegment === "pricing"
  const isCartPage = pageSegment === "cart"
  const isBrandKitPage = pageSegment === "brand-kit"
  const sectionLabel = sections.find((item) => item.key === section)?.label
  const settingsPageLabel = settingsSubpage === "account" ? "Account" : settingsSubpage === "social" ? "Social" : settingsSubpage === "analytics" ? "Analytics" : "General"
  const pageLabel = isSettingsPage ? settingsPageLabel : isCheckoutPage ? "Checkout" : isPricingPage ? "Pricing" : isCartPage ? "Cart" : isBrandKitPage ? "Brand Kit" : sectionLabel
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
  const onPage = !isSettingsPage && !isCheckoutPage && !isPricingPage && !isCartPage && !isBrandKitPage
  // Analytics lives under Settings, so it leaves the main menu.
  const sidebarSections = sections.filter((item) => !["activity", "analytics"].includes(item.key))
  // Help sits at the bottom of the menu as a plain text link.
  // Billing and Help sit at the bottom of the menu as plain text links, Billing first.
  const footerSections = ["billings", "ngai"].flatMap((key) => sidebarSections.filter((item) => item.key === key))
  const groupOf = (key: string) => MENU_GROUPS.find((group) => group.items.some((item) => item.key === key))
  // Each section shows once: on its own, or as the first page of its group, which then stands for the whole group.
  const menuSections = sidebarSections.filter((item) => {
    if (item.key === "ngai" || item.key === "billings") return false
    const group = groupOf(item.key)
    if (!group) return true
    return group.items.find((entry) => sidebarSections.some((s) => s.key === entry.key))?.key === item.key
  })

  function renderItem(item: SectionItem) {
    const isActive = onPage && section === item.key
    const group = groupOf(item.key)
    if (group) {
      const items = group.items
        .filter((entry) => sidebarSections.some((s) => s.key === entry.key))
        .map((entry): MenuGroupItem => ({
          key: entry.key,
          label: entry.label,
          href: sectionHref(entry.key as SectionItem["key"]),
          icon: SUBMENU_ICONS[entry.key],
          count: entry.key === "projects" ? projects.length : undefined,
        }))
      // A group with one page the viewer can open is a plain link under the group's name.
      if (items.length > 1) {
        return (
          <MenuGroup
            key={group.key}
            icon={group.icon}
            label={group.label}
            items={items}
            active={onPage && items.some((entry) => entry.key === section) ? section : null}
          />
        )
      }
      item = { ...item, label: group.label, icon: group.icon } as SectionItem
    }
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
              <NgaiMark className="size-[18px] shrink-0 max-md:size-5" />
            ) : item.icon ? (
              <item.icon className="h-4 w-4" aria-hidden="true" />
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
                  <SidebarTakeoverMenu sections={<>{menuSections.map(renderItem)}</>} />
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            {footerSections.length > 0 && (
              <nav aria-label="Billing and help" className="mt-auto flex flex-col gap-1 px-4 pt-3 pb-5 group-data-[collapsible=icon]:hidden">
                {footerSections.map((item) => {
                  const isActive = onPage && section === item.key
                  return (
                    <CompanySidebarLink
                      key={item.key}
                      href={sectionHref(item.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-sm py-1.5 text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                        isActive ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                      {item.key === "billings" && overdueInvoiceCount > 0 && (
                        <span className="text-xs font-medium text-destructive">{overdueInvoiceCount} overdue</span>
                      )}
                    </CompanySidebarLink>
                  )
                })}
              </nav>
            )}
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
                  <CartButton cartHref={`${companyPath}/cart`} servicesHref={`${companyPath}/pricing`} />
                  <NotificationsButton activity={activity} hrefFor={activityHref} viewAllHref={`${companyPath}/notifications`} />
                </>
              )}
              <SidebarAccount header />
            </div>
          </header>
          {/* The active section fills the content area below the header. */}
          <div className="flex min-w-0 flex-1">
            <main className={cn(
              "min-w-0 flex-1 bg-card dark:bg-background px-3 sm:px-6 md:m-3 md:mt-0 md:rounded-2xl md:shadow-[0_6px_24px_rgba(15,23,42,0.04)] lg:px-8",
              // Ngai, as a page or a campaign tab, runs its composer down to the bottom edge; other pages keep room below.
              section === "ngai" ? "pb-1 md:pb-1" : "pb-16 md:pb-6 has-[[data-ngai-page]]:pb-1 md:has-[[data-ngai-page]]:pb-1",
              recordOpen ? "pt-0 sm:pt-0" : "pt-1 sm:pt-6",
            )}>
              {(isSettingsPage || isCheckoutPage || isPricingPage || isCartPage || isBrandKitPage || section !== "about") && pageLabel && !recordOpen && (
                <div className="mb-0.5 flex items-center justify-between gap-3">
                  <h2 className="surface-record-title min-w-0 truncate max-md:hidden">{pageLabel}</h2>
                  {/* Pages portal their own action buttons here, opposite the title. */}
                  <div id="company-title-actions" className="ml-auto flex shrink-0 items-center gap-2" />
                </div>
              )}
              {children}
            </main>
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
