"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, Bell, Briefcase, Building2, FileText, Home, ListTodo, Plus, Receipt, ScrollText, Search, Users, X } from "lucide-react"
import { FiCheckSquare, FiMail, FiUser } from "react-icons/fi"

import { useAgent } from "@/components/agent/agent-context"
import { AppSidebar, type NavLink } from "@/components/app-sidebar"
import { MobileFooterNav, type MobileFooterNavItem } from "@/components/mobile-footer-nav"
import { useDashboardSearch } from "@/components/dashboard/sidebar-search"
import { GlobalSearchDialog } from "@/components/search/global-search"
import { useUnreadEmailCount } from "@/components/dashboard/email/use-unread-email-count"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dashboardPageTitle } from "@/lib/page-titles"
import { usePageHeaderOverride } from "@/components/dashboard/page-title-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NgaiSidePanel = dynamic(() => import("@/components/agent/ngai-side-panel").then((module) => module.NgaiSidePanel), { ssr: false })

export type { NavLink }

const QUICK_CREATE_LINKS = [
  { label: "Client", href: "/dashboard/clients", icon: Building2 },
  { label: "New Contact", href: "/dashboard/users", icon: Users },
  { label: "Project", href: "/dashboard/projects", icon: Briefcase },
  { label: "Task", href: "/dashboard/tasks", icon: ListTodo },
  { label: "Invoice", href: "/dashboard/invoices/new", icon: Receipt },
  { label: "Estimate", href: "/dashboard/estimates/new", icon: FileText },
  { label: "Contract", href: "/dashboard/contracts/new", icon: ScrollText },
  // Documents use their full template/company selection flow from the header.
  { label: "Document", href: "/dashboard/documents", icon: FileText },
] as const

/** The "create new…" dropdown, opened from the header's Plus button. */
function QuickCreateMenu({ trigger, onSelect }: { trigger: ReactNode; onSelect: (label: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dashboard-body">
        {QUICK_CREATE_LINKS.map(({ label, icon: Icon }) => (
          <DropdownMenuItem key={label} onSelect={() => onSelect(label)}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Bottom tab bar for mobile. Must render inside SidebarProvider. */
function DashboardMobileFooterNav({ unreadEmailCount }: { unreadEmailCount: number }) {
  const items: MobileFooterNavItem[] = [
    { key: "tasks", label: "Tasks", icon: FiCheckSquare, href: "/dashboard/tasks" },
    { key: "email", label: "Emails", icon: FiMail, href: "/dashboard/email", badge: unreadEmailCount },
    { key: "clients", label: "Clients", icon: Building2, href: "/dashboard/clients" },
    { key: "invoices", label: "Invoices", icon: Receipt, href: "/dashboard/invoices" },
    { key: "profile", label: "Profile", icon: FiUser, href: "/dashboard/account" },
  ]

  return <MobileFooterNav items={items} />
}

/**
 * Shared dashboard layout (admin + client), built on the shadcn sidebar-07
 * block: SidebarProvider > AppSidebar + SidebarInset with a mobile opener.
 */
export function DashboardShell({
  navLinks,
  rootHref,
  navExtra,
  banner,
  children,
}: {
  title: string
  navLinks: NavLink[]
  rootHref: string
  navExtra?: ReactNode
  /** Full-width strip pinned above the whole shell (sidebar included). Keep it h-10. */
  banner?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  // Document detail and editor screens keep the focused layout, while the
  // navigation remains available as a collapsed icon rail.
  const isDocumentRoute = /^\/dashboard\/documents\/[^/]+/.test(pathname ?? "")
  const isProjectDetailRoute = /^\/dashboard\/projects\/[^/]+$/.test(pathname ?? "")
  const isTaskDetailRoute = /^\/dashboard\/tasks\/[^/]+$/.test(pathname ?? "")
  const isBackDetailRoute = isProjectDetailRoute || isTaskDetailRoute
  const isCompanyDetailRoute = /^\/dashboard\/(?:companies|clients)\/[^/]+$/.test(pathname ?? "")
  // The dashboard home is Ngai too, so it gets the same full-height chat layout.
  const isAgentRoute = pathname === "/dashboard" || /^\/dashboard\/agent(?:\/[^/]+)?$/.test(pathname ?? "")
  const isEmailRoute = pathname === "/dashboard/email"
  const hideHeader = isDocumentRoute
  const [sidebarOpen, setSidebarOpen] = useState(!isDocumentRoute)
  const { open: agentOpen } = useAgent()
  const { agency } = useAuth()
  const unreadEmailCount = useUnreadEmailCount()
  const { override: titleOverride, titleNode, headerSearch, actions: headerActions, replacesMobileDefaults, setHeaderSlot, hideMobileFooter, backAction } = usePageHeaderOverride()
  const { open: searchOpen, setOpen: setSearchOpen, openSearch, results: searchResults, loading: searchLoading } = useDashboardSearch()
  const [createItem, setCreateItem] = useState<(typeof QUICK_CREATE_LINKS)[number] | null>(null)
  const [createName, setCreateName] = useState("")
  const [documentCreateOpen, setDocumentCreateOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(!isDocumentRoute)
  }, [isDocumentRoute])

  function closeCreateModal() {
    setCreateItem(null)
    setCreateName("")
  }

  function selectQuickCreate(label: string) {
    if (label === "Document") {
      setDocumentCreateOpen(true)
      return
    }
    setCreateName("")
    setCreateItem(QUICK_CREATE_LINKS.find((item) => item.label === label) ?? null)
  }

  function createFromHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!createItem) return
    const query = createName.trim() ? `?name=${encodeURIComponent(createName.trim())}` : ""
    const destination = `${createItem.href}${query}`
    closeCreateModal()
    router.push(destination)
  }

  return (
    // h-svh + overflow-hidden: the shell never grows taller than the viewport,
    // so the body never scrolls. Only SidebarInset (overflow-y-auto) scrolls.
    <div className="dashboard-body flex h-svh flex-col overflow-hidden bg-background font-sans [&_*]:font-sans">
      {banner && <div className="z-50 h-10 shrink-0">{banner}</div>}
      <SidebarProvider
        open={agentOpen ? false : sidebarOpen}
        onOpenChange={setSidebarOpen}
        className={cn(
          "!min-h-0 flex-1",
          banner && "[&_[data-slot=sidebar-container]]:top-10 [&_[data-slot=sidebar-container]]:h-[calc(100svh-2.5rem)]"
        )}
      >
        <AppSidebar navLinks={navLinks} rootHref={rootHref} navExtra={navExtra} brandName={agency?.name} brandLogoUrl={agency?.logoUrl} unreadEmailCount={unreadEmailCount} />
        {/* overflow-y-auto: this column is the scroll container, not the body */}
        <SidebarInset
          className={cn(
            "min-h-0 bg-card md:!m-0 md:!rounded-none md:bg-background md:!shadow-none",
            isAgentRoute ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto",
            !hideMobileFooter && "max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]",
            isEmailRoute && "lg:overflow-hidden",
          )}
        >
          <header
            className={cn(
              "surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-card px-4 text-foreground max-md:border-b max-md:border-border md:bg-background md:px-7",
              hideHeader && "md:hidden",
            )}
          >
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              {isBackDetailRoute ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      router.back()
                    } else {
                      router.push(isTaskDetailRoute ? "/dashboard/tasks" : "/dashboard/projects")
                    }
                  }}
                  aria-label={isTaskDetailRoute ? "Back to tasks" : "Back to projects"}
                  title={isTaskDetailRoute ? "Back to tasks" : "Back to projects"}
                  className="flex size-8 items-center justify-center rounded-md text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
              ) : backAction ? (
                <button
                  type="button"
                  onClick={backAction.onClick}
                  aria-label={backAction.label}
                  title={backAction.label}
                  className="flex size-8 items-center justify-center rounded-md text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
              ) : (
                <SidebarTrigger className="-ml-1" />
              )}
              {!isProjectDetailRoute && !backAction && <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 max-md:data-[orientation=vertical]:h-6" />}
            </div>
            <div className={cn("flex min-w-0 items-center gap-1 md:gap-3", titleNode && "flex-1")}>
              <div className="relative hidden w-64 shrink-0 md:block lg:w-72">
                {headerSearch ? (
                  <>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input type="search" value={headerSearch.query} onChange={(event) => headerSearch.onQueryChange(event.target.value)} placeholder={headerSearch.placeholder} aria-label={headerSearch.placeholder} className="h-10 rounded-full border-0 bg-muted pl-9 pr-8 shadow-none [&::-webkit-search-cancel-button]:hidden" />
                    {headerSearch.query && <button type="button" onClick={() => headerSearch.onQueryChange("")} aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5" aria-hidden="true" /></button>}
                  </>
                ) : (
                  <button type="button" onClick={openSearch} className="flex h-10 w-full items-center gap-2 rounded-full bg-muted px-3 text-left text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Search workspace">
                    <Search className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Search workspace</span>
                  </button>
                )}
              </div>
              {titleOverride?.homeHref && (
                <Link
                  href={titleOverride.homeHref}
                  aria-label="Home"
                  title="Home"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground max-md:text-foreground"
                >
                  <Home className="size-4 max-md:size-5" aria-hidden="true" />
                </Link>
              )}
              <h1 className={cn("surface-title min-w-0 truncate max-md:[--surface-title-size:17px]", titleNode && "flex-1", !titleNode && "md:sr-only")}>
                {titleNode ?? titleOverride?.title ?? dashboardPageTitle(pathname ?? "/dashboard")}
              </h1>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {!isBackDetailRoute && <Button type="button" variant="ghost" size="icon" aria-label="Search workspace" onClick={openSearch} className={cn("size-10 md:hidden [&_svg]:size-5", replacesMobileDefaults && "max-sm:hidden")}><Search className="size-4" aria-hidden="true" /></Button>}
              <div ref={setHeaderSlot} className="contents" />
              {headerActions}
              {!isCompanyDetailRoute && !isBackDetailRoute && (
                <QuickCreateMenu
                  onSelect={selectQuickCreate}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Create new"
                      title="Create new"
                      className={cn("max-md:border-transparent max-md:bg-transparent max-md:shadow-none", replacesMobileDefaults && "max-sm:hidden")}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </Button>
                  }
                />
              )}
              <Button type="button" variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Notifications">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </header>
          <div className={cn(
            "flex min-h-0 flex-1 flex-col bg-card md:m-3 md:mt-0 md:rounded-2xl md:shadow-[0_6px_24px_rgba(15,23,42,0.04)]",
            !isAgentRoute && !isEmailRoute && "md:pb-6",
            (isAgentRoute || isEmailRoute) && "lg:overflow-hidden",
            hideHeader && "md:mt-3",
          )}>
            {children}
          </div>
        </SidebarInset>
        <NgaiSidePanel />
        {!hideMobileFooter && <DashboardMobileFooterNav unreadEmailCount={unreadEmailCount} />}
      </SidebarProvider>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} results={searchResults} loading={searchLoading} placeholder="Search companies, projects, documents…" />

      <Dialog
        open={Boolean(createItem)}
        onOpenChange={(open) => {
          if (!open) closeCreateModal()
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Create {createItem?.label ?? "new"}</DialogTitle>
            <DialogDescription>Add the basics, then continue to the {createItem?.label?.toLowerCase() ?? "new item"} page.</DialogDescription>
          </DialogHeader>
          {createItem && (
            <form onSubmit={createFromHeader} className="space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="quick-create-name">{createItem.label} name</Label>
                <Input
                  id="quick-create-name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder={`Enter a ${createItem.label.toLowerCase()} name`}
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={closeCreateModal}>Cancel</Button>
                <Button type="submit">Create {createItem.label}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <NewDocumentDialog open={documentCreateOpen} onOpenChange={setDocumentCreateOpen} />
    </div>
  )
}
