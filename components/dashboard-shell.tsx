"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Bot, Briefcase, Building2, CircleHelp, FileText, Home, ListTodo, Mail, Plus, Receipt, ScrollText, Users } from "lucide-react"

import { useAgent } from "@/components/agent/agent-context"
import { AgentHeaderButton } from "@/components/agent/agent-header-button"
import { AppSidebar, type NavLink } from "@/components/app-sidebar"
import { NgaiSidePanel } from "@/components/agent/ngai-side-panel"
import { MobileFooterNav, type MobileFooterNavItem } from "@/components/mobile-footer-nav"
import { DashboardSearchButton } from "@/components/dashboard/dashboard-search-button"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dashboardPageTitle } from "@/components/dashboard/dashboard-document-title"
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
import { getTenant, type Tenant } from "@/lib/tenants"
import { useAuth } from "@/components/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type { NavLink }

const QUICK_CREATE_LINKS = [
  { label: "Company", href: "/dashboard/companies", icon: Building2 },
  { label: "New Contact", href: "/dashboard/users", icon: Users },
  { label: "Project", href: "/dashboard/projects", icon: Briefcase },
  { label: "Task", href: "/dashboard/tasks", icon: ListTodo },
  { label: "Invoice", href: "/dashboard/invoices/new", icon: Receipt },
  { label: "Estimate", href: "/dashboard/estimates/new", icon: FileText },
  { label: "Contract", href: "/dashboard/contracts/new", icon: ScrollText },
  // Documents use their full template/company selection flow from the header.
  { label: "Document", href: "/dashboard/documents", icon: FileText },
] as const

/** The "create new…" dropdown, shared by the header's Plus button and the mobile footer's center Plus. */
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

/** Bottom tab bar for mobile, replacing the floating Ngai composer. Must render inside SidebarProvider. */
function DashboardMobileFooterNav({ rootHref, onQuickCreate }: { rootHref: string; onQuickCreate: (label: string) => void }) {
  const { open: agentOpen, setOpen: setAgentOpen } = useAgent()

  const items: MobileFooterNavItem[] = [
    { key: "home", label: "Home", icon: Home, href: rootHref },
    { key: "email", label: "Emails", icon: Mail, href: "/dashboard/email" },
    {
      key: "create",
      render: ({ className }) => (
        <QuickCreateMenu
          onSelect={onQuickCreate}
          trigger={
            <button type="button" aria-label="Create new" className={className}>
              <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
                <Plus className="size-5" aria-hidden="true" />
              </span>
            </button>
          }
        />
      ),
    },
    { key: "documents", label: "Documents", icon: FileText, href: "/dashboard/documents" },
    { key: "ngai", label: "Ngai", icon: Bot, onClick: () => setAgentOpen(true), isActive: agentOpen },
  ]

  return <MobileFooterNav items={items} />
}

/**
 * Shared dashboard layout (admin + client), built on the shadcn sidebar-07
 * block: SidebarProvider > AppSidebar + SidebarInset with a mobile opener.
 */
export function DashboardShell({
  subtitle,
  navLinks,
  rootHref,
  navExtra,
  banner,
  children,
}: {
  title: string
  subtitle?: string
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
  const isEmailRoute = pathname === "/dashboard/email"
  const hideHeader = isDocumentRoute
  const [sidebarOpen, setSidebarOpen] = useState(!isDocumentRoute)
  const { open: agentOpen } = useAgent()
  const { user } = useAuth()
  const { override: titleOverride } = usePageHeaderOverride()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [createItem, setCreateItem] = useState<(typeof QUICK_CREATE_LINKS)[number] | null>(null)
  const [createName, setCreateName] = useState("")
  const [documentCreateOpen, setDocumentCreateOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(!isDocumentRoute)
  }, [isDocumentRoute])

  useEffect(() => {
    if (!user) { setTenant(null); return }
    let active = true
    void getTenant().then((value) => { if (active) setTenant(value) }).catch(() => { if (active) setTenant(null) })
    return () => { active = false }
  }, [user])

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
    <div className="dashboard-body flex h-svh flex-col overflow-hidden font-sans [&_*]:font-sans">
      {banner && <div className="z-50 h-10 shrink-0">{banner}</div>}
      <SidebarProvider
        open={agentOpen ? false : sidebarOpen}
        onOpenChange={setSidebarOpen}
        className={cn(
          "min-h-0 flex-1",
          banner && "[&_[data-slot=sidebar-container]]:top-10 [&_[data-slot=sidebar-container]]:h-[calc(100svh-2.5rem)]"
        )}
      >
        <AppSidebar navLinks={navLinks} rootHref={rootHref} subtitle={subtitle} navExtra={navExtra} brandName={tenant?.name} brandLogoUrl={tenant?.logoUrl} />
        {/* overflow-y-auto: this column is the scroll container, not the body */}
        <SidebarInset
          className={cn(
            "overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6",
            pathname === "/dashboard/email" && "lg:min-h-0 lg:overflow-hidden lg:pb-0",
          )}
        >
          <header
            className={cn(
              "surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-background px-4",
              "max-md:bg-primary max-md:[--foreground:var(--primary-foreground)] max-md:[--muted-foreground:var(--primary-foreground)]",
              hideHeader && "md:hidden",
              isEmailRoute && "max-lg:hidden",
            )}
          >
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="max-md:bg-primary-foreground/30 data-[orientation=vertical]:h-4" />
            </div>
            <div className="flex min-w-0 items-center gap-1">
              {titleOverride?.homeHref && (
                <Link
                  href={titleOverride.homeHref}
                  aria-label="Home"
                  title="Home"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Home className="size-4" aria-hidden="true" />
                </Link>
              )}
              <h1 className="surface-title min-w-0 truncate">
                {titleOverride?.title ?? dashboardPageTitle(pathname ?? "/dashboard")}
              </h1>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <DashboardSearchButton className="md:hidden" />
              <QuickCreateMenu
                onSelect={selectQuickCreate}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Create new"
                    title="Create new"
                    className="max-md:border-transparent max-md:bg-transparent max-md:shadow-none"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
              <Button asChild variant="outline" className="surface-nav hidden sm:inline-flex">
                <Link href="/pricing" aria-label="Upgrade" title="Upgrade">
                  <span>Upgrade</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
                <Link href="/faq" aria-label="Help">
                  <CircleHelp className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
          <AgentHeaderButton className="ml-0" />
            </div>
          </header>
          {children}
        </SidebarInset>
        <NgaiSidePanel />
        <DashboardMobileFooterNav rootHref={rootHref} onQuickCreate={selectQuickCreate} />
      </SidebarProvider>

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
