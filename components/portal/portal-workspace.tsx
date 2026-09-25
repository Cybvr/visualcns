"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronsUpDown, ClipboardList, FileSignature, FileText, FolderOpen, ImageIcon, LayoutDashboard, Lightbulb, ListTodo, LogOut, Menu, MessageSquare, Receipt, Settings, Sparkles, Users } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AgentChat } from "@/components/agent/agent-chat"
import { AgentDock } from "@/components/agent/agent-dock"
import { useAgent } from "@/components/agent/agent-context"
import { AgentHeaderButton } from "@/components/agent/agent-header-button"
import { NgaiSidePanel } from "@/components/agent/ngai-side-panel"
import { MobileFooterNav, type MobileFooterNavItem } from "@/components/mobile-footer-nav"
import { DOC_BADGE, DocTile } from "@/components/company/document-tile"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { formatMoney, type Contract, type Estimate, type Invoice } from "@/lib/billing"
import { companyDocumentKindMeta, type CompanyDocument } from "@/lib/company-documents"
import { projectStatusMeta } from "@/lib/projects"
import { taskStatusMeta, type TaskStatus } from "@/lib/tasks"
import { cn } from "@/lib/utils"
import type { SharedDocument } from "@/lib/documents"
import { billingTotals, invoiceBalance, portalDocumentPath, portalPath, safeExternalUrl, type PortalProject, type PortalTab, type PortalTask } from "@/lib/portal-model"
import { buildActivity, type ActivityItem } from "@/lib/activity"
import { completePortalTask } from "@/lib/portal-data"
import type { Project } from "@/lib/projects"
import type { Organization, PublicTeamMember } from "@/lib/organizations"
import { CompanyMedia } from "@/components/company/company-media"
import { ProjectCard } from "@/components/project-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GlobalSearchDialog, SearchTrigger, stripHtml, useSearchHotkey, type SearchResult } from "@/components/search/global-search"
import { usePortal, type PortalData } from "./portal-provider"
import { PortalNotice } from "./portal-shell"
import { PortalTaskFeedback } from "./portal-task-feedback"
import { PortalInsights } from "./portal-insights"

const TAB_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  projects: FolderOpen,
  contacts: Users,
  tasks: ListTodo,
  documents: FileText,
  media: ImageIcon,
  insights: Lightbulb,
  ngai: Sparkles,
}

const COMPANY_TABS = ["overview", "projects", "contacts", "tasks", "documents", "media", "insights", "ngai"]

function shortDate(value: string) {
  if (!value) return ""
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function Panel({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="surface-section-label flex items-center gap-2">{title}{count !== undefined && <span className="font-normal tabular-nums text-muted-foreground">{count}</span>}</h2>{action}</div>{children}</section>
}

function Empty({ children }: { children: ReactNode }) { return <p className="py-4 text-sm leading-6 text-muted-foreground">{children}</p> }

function About({ organization }: { organization: Organization }) {
  const externalLink = (value: string) => safeExternalUrl(/^https?:\/\//.test(value) ? value : `https://${value}`)
  const rows: { label: string; node: ReactNode }[] = []
  if (organization.website) {
    const href = externalLink(organization.website)
    rows.push({ label: "Domain", node: href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{organization.website}<ArrowUpRight className="size-3.5 shrink-0" /></a> : organization.website })
  }
  if (organization.industry) rows.push({ label: "Industry", node: organization.industry })
  if (organization.location) rows.push({ label: "Location", node: organization.location })
  if (organization.companySize) rows.push({ label: "Company Size", node: `${organization.companySize} employees` })
  if (organization.source) rows.push({ label: "Source", node: organization.source })
  if (organization.linkedIn) {
    const href = externalLink(organization.linkedIn)
    rows.push({ label: "LinkedIn", node: href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">View profile<ArrowUpRight className="size-3.5 shrink-0" /></a> : organization.linkedIn })
  }

  const hasContent = Boolean(organization.description) || (organization.tags?.length ?? 0) > 0 || rows.length > 0

  return <Panel title="About">{hasContent ? <div className="space-y-5">
    {organization.description && <p className="max-w-2xl whitespace-pre-wrap text-sm leading-6">{organization.description}</p>}
    {(organization.tags?.length ?? 0) > 0 && <div className="flex flex-wrap gap-1.5">{organization.tags!.map(tag => <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{tag}</span>)}</div>}
    {rows.length > 0 && <dl className="divide-y divide-border">{rows.map(row => <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-sm"><dt className="shrink-0 text-muted-foreground">{row.label}</dt><dd className="min-w-0 truncate text-right font-medium">{row.node}</dd></div>)}</dl>}
  </div> : <Empty>Your agency hasn’t added company details yet.</Empty>}</Panel>
}

function Contacts({ people }: { people: PublicTeamMember[] }) {
  return <Panel title="Contacts" count={people.length}>{people.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">{people.map(person => <ProjectCard
    key={person.uid}
    project={{ id: person.uid, companyId: "", client: "", title: person.name, service: person.role || "Contact", status: "in-progress", progress: 0, dueDate: "", thumbnailUrl: person.photoUrl || "" }}
    subtitle={person.role || "Contact"}
    footer={person.role ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{person.role}</span> : undefined}
  />)}</div> : <Empty>Your agency will list your team contacts here.</Empty>}</Panel>
}

function BillingSummary({ invoices, onView }: { invoices: Invoice[]; onView: () => void }) {
  const totals = billingTotals(invoices)
  return <Panel title="Billing" action={<button onClick={onView} className="rounded-sm text-xs font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2">View documents</button>}>
    {totals.length ? <div className="space-y-6">{totals.map(total => <div key={total.currency}>
      {totals.length > 1 && <p className="mb-3 text-xs font-medium text-muted-foreground">{total.currency}</p>}
      <dl className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">{([['Outstanding', total.outstanding], ['Overdue', total.overdue], ['Paid', total.paid]] as const).map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-base font-semibold tabular-nums">{formatMoney(value, total.currency)}</dd></div>)}</dl>
    </div>)}</div> : <Empty>No invoices have been issued yet.</Empty>}
  </Panel>
}

function Files({ files }: { files: SharedDocument[] }) {
  return <Panel title="Files & links" count={files.length}>{files.length ? <ul className="divide-y divide-border">{files.map(file => {
    const href = safeExternalUrl(file.url)
    return <li key={file.id} className="py-3 first:pt-0 last:pb-0"><div className="flex items-start gap-3"><FileText className="mt-1 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1">{href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 break-words text-sm font-medium underline-offset-4 hover:underline">{file.title}<ArrowUpRight className="size-3.5 shrink-0" /></a> : <p className="text-sm font-medium">{file.title}</p>}<p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{file.description || (href ? "Shared with your company" : "This file link is unavailable.")}</p></div></div></li>
  })}</ul> : <Empty>Files shared by your agency will appear here.</Empty>}</Panel>
}

const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "review", "done"]

/** Where "Sign in" sends a share-link visitor, returning them to this page. */
function useSignInHref() {
  const pathname = usePathname()
  return `/login?next=${encodeURIComponent(pathname)}`
}

/** Shown to share-link visitors in place of anything that needs an account. */
export function SignInPrompt({ action }: { action: string }) {
  const href = useSignInHref()
  return <p className="text-sm text-muted-foreground"><Link href={href} className="font-medium text-foreground underline underline-offset-4">Sign in</Link> {action}.</p>
}

function TaskItem({ task, uid, canAct, onChanged, card = false }: { task: PortalTask; uid: string; canAct: boolean; onChanged: () => void; card?: boolean }) {
  const { publicView } = usePortal()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function toggle() {
    setSaving(true); setError("")
    try { await completePortalTask(task.id, task.status !== "done"); onChanged() } catch { setError("Couldn’t update this task. Please try again."); setSaving(false) }
  }
  return <li className={card ? "bg-card p-3" : "py-4 first:pt-0 last:pb-0"}>
    <div className="flex items-start gap-3"><input type="checkbox" checked={task.status === "done"} disabled={saving || !canAct || task.assigneeUid !== uid} onChange={() => void toggle()} aria-label={`Complete ${task.name}`} className="mt-1 size-4 shrink-0 accent-primary" />
      <div className="min-w-0 flex-1"><button onClick={() => setOpen(value => !value)} aria-expanded={open} className="w-full rounded-sm text-left text-sm font-medium leading-6 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"><span className={task.status === "done" ? "text-muted-foreground line-through" : ""}>{task.name}</span></button><p className="mt-1 text-xs text-muted-foreground">{task.dueDate ? `Due ${shortDate(task.dueDate)}` : "No due date"}{task.assigneeUid === uid ? " · Assigned to you" : task.status === "done" ? " · Completed" : " · Shared task"}</p></div>
      <button aria-label={`Open feedback for ${task.name}`} aria-expanded={open} onClick={() => setOpen(value => !value)} className="rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2"><MessageSquare className="size-4" /></button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    {open && <div className="ml-7 mt-4">{task.instructions && <p className="mb-5 whitespace-pre-wrap text-sm leading-6">{task.instructions}</p>}{publicView ? <SignInPrompt action="to see and leave feedback" /> : <PortalTaskFeedback task={task} canAct={canAct} />}</div>}
  </li>
}

/** Read-only kanban: the same status columns as the agency board, no drag and no editing. */
function TaskBoard({ tasks, uid, canAct, onChanged }: { tasks: PortalTask[]; uid: string; canAct: boolean; onChanged: () => void }) {
  return <div className="scrollbar-none flex gap-4 overflow-x-auto pb-1">{TASK_STATUS_ORDER.map(status => {
    const items = tasks.filter(task => task.status === status)
    const meta = taskStatusMeta[status]
    return <div key={status} className="flex w-[260px] shrink-0 flex-col gap-3 rounded-xl bg-muted/30 p-2">
      <div className="flex items-center gap-2 px-1 pt-1"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>{meta.label}</span><span className="text-xs tabular-nums text-muted-foreground">{items.length}</span></div>
      {items.length ? <ul className="flex flex-col gap-2">{items.map(task => <TaskItem key={task.id} task={task} uid={uid} canAct={canAct} onChanged={onChanged} card />)}</ul> : <p className="px-1 pb-2 text-xs text-muted-foreground">Nothing here yet.</p>}
    </div>
  })}</div>
}

function Tasks({ tasks, uid, canAct, onChanged, all = false }: { tasks: PortalTask[]; uid: string; canAct: boolean; onChanged: () => void; all?: boolean }) {
  const visible = all ? tasks : tasks.filter(task => task.assigneeUid === uid)
  return <Panel title={all ? "Shared tasks" : "My tasks"} count={visible.length}>{visible.length ? (all ? <TaskBoard tasks={visible} uid={uid} canAct={canAct} onChanged={onChanged} /> : <ul className="divide-y divide-border">{visible.map(task => <TaskItem key={task.id} task={task} uid={uid} canAct={canAct} onChanged={onChanged} />)}</ul>) : <Empty>{all ? "Your agency hasn’t shared any tasks here yet." : "No tasks are assigned to you right now."}</Empty>}</Panel>
}

/** The written documents: proposals, statements of work, briefs. */
function CompanyDocuments({ company, documents }: { company: string; documents: CompanyDocument[] }) {
  return <Panel title="Documents" count={documents.length}>{documents.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">{documents.map(row => <DocTile
    key={row.id}
    icon={FileText}
    badgeClass={DOC_BADGE.document}
    title={row.title}
    subtitle={companyDocumentKindMeta[row.kind]?.label ?? "Document"}
    href={portalDocumentPath(company, "document", row.id)}
  />)}</div> : <Empty>Proposals and other documents your agency writes for you will appear here.</Empty>}</Panel>
}

function BillingDocuments({ company, invoices, contracts, estimates }: { company: string; invoices: Invoice[]; contracts: Contract[]; estimates: Estimate[] }) {
  const rows = [
    ...invoices.map(item => ({ id: item.id, kind: "invoice" as const, title: `Invoice ${item.invoiceNumber}`, subtitle: `${formatMoney(item.amount, item.currency)} · ${item.status}`, icon: Receipt, badge: DOC_BADGE.invoice })),
    ...estimates.map(item => ({ id: item.id, kind: "estimate" as const, title: item.title || `Estimate ${item.estimateNumber}`, subtitle: `${formatMoney(item.amount, item.currency)} · ${item.status}`, icon: ClipboardList, badge: DOC_BADGE.estimate })),
    ...contracts.map(item => ({ id: item.id, kind: "contract" as const, title: item.title, subtitle: `Contract · ${item.status}`, icon: FileSignature, badge: DOC_BADGE.contract })),
  ]
  return <Panel title="Billing documents" count={rows.length}>{rows.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">{rows.map(row => <DocTile key={`${row.kind}:${row.id}`} icon={row.icon} badgeClass={row.badge} title={row.title} subtitle={row.subtitle} href={portalDocumentPath(company, row.kind, row.id)} />)}</div> : <Empty>Issued invoices, estimates and contracts will appear here.</Empty>}</Panel>
}

/** Newest-first log of what the agency has shared. Hidden entirely when empty. */
function ActivityPanel({ items, hrefFor }: { items: ActivityItem[]; hrefFor: (item: ActivityItem) => string | undefined }) {
  if (!items.length) return null
  return <Panel title="Recent activity" count={items.length}><ul className="divide-y divide-border">{items.map(item => {
    const href = hrefFor(item)
    const body = <><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p></>
    return <li key={item.id} className="py-3 first:pt-0 last:pb-0">{href ? <Link href={href} className="block rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2">{body}</Link> : body}</li>
  })}</ul></Panel>
}

/** Footer account chip, styled like the dashboard's NavUser but with portal-only actions. */
function PortalNavUser() {
  const { publicView } = usePortal()
  const signInHref = useSignInHref()
  if (publicView) return <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild><Link href={signInHref}><LogOut className="rotate-180" />Sign in</Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
  return <PortalAccountMenu />
}

function PortalAccountMenu() {
  const { isMobile } = useSidebar()
  const { user, appUser, isAdmin, isImpersonating, signOut, stopViewingAs } = useAuth()
  const router = useRouter()
  const { companySlug } = useParams<{ companySlug: string }>()
  const name = appUser?.displayName || appUser?.company || user?.displayName || "Account"
  const email = appUser?.email || user?.email || ""
  const photoURL = appUser?.photoURL || user?.photoURL
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">{photoURL && <AvatarImage src={photoURL} alt={name} referrerPolicy="no-referrer" />}<AvatarFallback className="rounded-lg">{initials}</AvatarFallback></Avatar>
              <div className="surface-nav grid flex-1 text-left leading-tight"><span className="truncate font-medium">{name}</span><span className="truncate">Basic</span></div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? "bottom" : "top"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">{photoURL && <AvatarImage src={photoURL} alt={name} referrerPolicy="no-referrer" />}<AvatarFallback className="rounded-lg">{initials}</AvatarFallback></Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{name}</span><span className="truncate text-xs">{email}</span>{isImpersonating && <span className="truncate text-[10px] text-amber-700">Viewing as client</span>}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href={`${portalPath(companySlug)}?tab=account`}><Settings />Account settings</Link></DropdownMenuItem>
            {isAdmin && <DropdownMenuItem onClick={() => { stopViewingAs(); router.push("/dashboard/clients") }}><ArrowLeft />Back to agency</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}><LogOut />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Content search over everything already loaded for this company portal. */
function PortalSearch({ company }: { company: string }) {
  const data = usePortal()
  const [open, setOpen] = useState(false)
  const openSearch = useCallback(() => setOpen(true), [])
  useSearchHotkey(openSearch)

  const results = useMemo<SearchResult[]>(() => {
    const projectTitle = (id: string) => data.projects.find(item => item.id === id)?.title
    const join = (...parts: Array<string | undefined | null>) => parts.filter(Boolean).join(" · ")
    const keywords = (...parts: Array<string | undefined | null>) => parts.filter(Boolean).join(" ")
    return [
      ...data.projects.map(item => ({
        id: `project-${item.id}`,
        group: "Projects",
        label: item.title,
        sublabel: item.summary || undefined,
        href: `${portalPath(company)}/projects/${encodeURIComponent(item.id)}`,
        keywords: keywords(item.summary, item.status),
      })),
      ...data.tasks.map(item => ({
        id: `task-${item.id}`,
        group: "Tasks",
        label: item.name,
        sublabel: projectTitle(item.projectId) || undefined,
        href: item.projectId ? `${portalPath(company)}/projects/${encodeURIComponent(item.projectId)}` : `${portalPath(company)}/tasks`,
        keywords: keywords(stripHtml(item.instructions || ""), item.status),
      })),
      ...data.documents.map(item => ({
        id: `document-${item.id}`,
        group: "Documents",
        label: item.title,
        sublabel: join(item.kind, item.client) || undefined,
        href: portalDocumentPath(company, "document", item.id),
        keywords: keywords(item.project, item.summary, stripHtml(item.body || "")),
      })),
      ...data.invoices.map(item => ({
        id: `invoice-${item.id}`,
        group: "Billing",
        label: item.invoiceNumber || "Invoice",
        sublabel: item.project || undefined,
        href: portalDocumentPath(company, "invoice", item.id),
        keywords: keywords(item.client, item.project, item.poReference),
      })),
      ...data.estimates.map(item => ({
        id: `estimate-${item.id}`,
        group: "Billing",
        label: item.title || item.estimateNumber || "Estimate",
        sublabel: item.project || undefined,
        href: portalDocumentPath(company, "estimate", item.id),
        keywords: keywords(item.estimateNumber, item.client, item.project),
      })),
      ...data.contracts.map(item => ({
        id: `contract-${item.id}`,
        group: "Billing",
        label: item.title || "Contract",
        sublabel: item.project || undefined,
        href: portalDocumentPath(company, "contract", item.id),
        keywords: keywords(item.client, item.project),
      })),
      ...data.files.map(item => ({
        id: `file-${item.id}`,
        group: "Media",
        label: item.title,
        sublabel: item.type || undefined,
        href: `${portalPath(company)}/media`,
        keywords: keywords(item.description),
      })),
    ]
  }, [data, company])

  return (
    <>
      <SearchTrigger onOpen={openSearch} />
      <GlobalSearchDialog open={open} onOpenChange={setOpen} results={results} placeholder="Search this workspace…" />
    </>
  )
}

/** The main portal navigation. Items are larger on mobile, and tapping one closes the mobile drawer. */
function PortalTabNav({ company, activeTab }: { company: string; activeTab?: string }) {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      {COMPANY_TABS.map(item => {
        const Icon = TAB_ICONS[item] ?? LayoutDashboard
        return (
          <SidebarMenuItem key={item}>
            <SidebarMenuButton
              isActive={activeTab === item}
              tooltip={item}
              asChild
              className="surface-nav capitalize max-md:h-12 max-md:gap-3 max-md:px-3 max-md:[&>svg]:size-5"
            >
              <Link
                href={item === "overview" ? portalPath(company) : `${portalPath(company)}/${item}`}
                onClick={() => { if (isMobile) setOpenMobile(false) }}
              >
                <Icon className="h-4 w-4" />
                <span>{item}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

/** Header "Ask Ngai" button, shared with the dashboard. */
function PortalNgaiButton() {
  const { publicView } = usePortal()
  if (publicView) return null
  return <AgentHeaderButton className="ml-auto" />
}

/** Bottom tab bar for mobile, replacing the floating Ngai composer. */
function PortalMobileFooterNav({ company, activeTab }: { company: string; activeTab?: string }) {
  const { open: agentOpen, setOpen: setAgentOpen } = useAgent()
  const { setOpenMobile } = useSidebar()
  const { publicView } = usePortal()

  const items: MobileFooterNavItem[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard, href: portalPath(company), isActive: activeTab === "overview" },
    { key: "documents", label: "Documents", icon: FileText, href: `${portalPath(company)}/documents`, isActive: activeTab === "documents" },
    { key: "ngai", label: "Ngai", icon: Sparkles, onClick: () => setAgentOpen(true), isActive: agentOpen || activeTab === "ngai" },
    { key: "menu", label: "Menu", icon: Menu, onClick: () => setOpenMobile(true) },
  ].filter(item => !(publicView && item.key === "ngai")) as MobileFooterNavItem[]

  return <MobileFooterNav items={items} />
}

/** The full-page Ngai chat, shown on the portal's Ngai tab. */
function PortalNgai() {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()
  return (
    <div className="-mx-4 -my-5 flex h-[calc(100svh-3.5rem)] min-h-0 flex-col sm:-mx-6">
      <AgentChat
        messages={messages}
        conversations={conversations}
        activeConversationId={activeConversationId}
        sending={sending}
        firstName={firstName}
        onSend={send}
        onSelectConversation={selectConversation}
        onNewChat={reset}
      />
    </div>
  )
}

/** The portal chrome: collapsible company sidebar + dashboard-style header, wrapping any page's content. */
function PortalShellContents({ company, organization, activeTab, title, children }: { company: string; organization: Organization; activeTab?: string; title?: ReactNode; children: ReactNode }) {
  const { open: agentOpen } = useAgent()
  const { publicView } = usePortal()
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const sidebarStateBeforeAgent = useRef<boolean | null>(null)

  useEffect(() => {
    if (agentOpen) {
      if (sidebarStateBeforeAgent.current === null) sidebarStateBeforeAgent.current = sidebarOpen
      if (sidebarOpen) setSidebarOpen(false)
      return
    }

    if (sidebarStateBeforeAgent.current !== null) {
      const previousState = sidebarStateBeforeAgent.current
      sidebarStateBeforeAgent.current = null
      if (sidebarOpen !== previousState) setSidebarOpen(previousState)
    }
  }, [agentOpen, setSidebarOpen, sidebarOpen])

  return <>
    <Sidebar collapsible="icon" className="bg-background text-muted-foreground group-data-[side=left]:border-r-0 [&_[data-slot=sidebar-inner]]:bg-background">
      <div className="group/sidebar m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-card text-muted-foreground group-data-[collapsible=icon]:m-1 group-data-[collapsible=icon]:rounded-[12px]">
        <SidebarHeader className="group-data-[collapsible=icon]:p-1">
          <div className="flex h-12 items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link href={portalPath(company)}>
                    {safeExternalUrl(organization.logoUrl) ? <img src={organization.logoUrl} alt="" className="size-7 shrink-0 rounded-md border border-border object-contain p-0.5" /> : <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold" aria-hidden="true">{organization.name.slice(0, 1).toUpperCase()}</span>}
                    <span className="truncate font-semibold text-foreground">{organization.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarTrigger className="size-8 shrink-0" />
          </div>
          <PortalSearch company={company} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:p-1">
            <PortalTabNav company={company} activeTab={activeTab} />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:p-1">
          <PortalNavUser />
        </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
    <SidebarInset
      className="portal-content-area"
      data-agent-open={agentOpen ? "true" : "false"}
      data-ngai-open={agentOpen && activeTab !== "ngai" ? "true" : "false"}
    >
      <header className="surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
        </div>
        <h1 className="surface-title min-w-0 truncate capitalize">{title}</h1>
        <PortalNgaiButton />
      </header>
      <div className={cn("px-4 py-5 sm:px-6", activeTab !== "ngai" && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-5")}>{children}</div>
    </SidebarInset>
    {!publicView && <NgaiSidePanel />}
    {!publicView && <AgentDock />}
    <PortalMobileFooterNav company={company} activeTab={activeTab} />
  </>
}

export function PortalShellLayout(props: { company: string; organization: Organization; activeTab?: string; title?: ReactNode; children: ReactNode }) {
  return <SidebarProvider>
    <PortalShellContents {...props} />
  </SidebarProvider>
}

export function PortalWorkspaceView({ data, project, company, uid, canAct, tab, onTab, onChanged }: { data: PortalData; project?: PortalProject; company: string; uid: string; canAct: boolean; tab: string; onTab: (tab: string) => void; onChanged: () => void }) {
  const { publicView } = usePortal()
  const tasks = data.tasks.filter(item => !project || item.projectId === project.id)
  const invoices = data.invoices.filter(item => !project || item.projectId === project.id)
  const estimates = data.estimates.filter(item => !project || item.projectId === project.id)
  const contracts = data.contracts.filter(item => !project || item.projectId === project.id)
  const files = data.files.filter(item => !project || item.projectId === project.id)
  const documents = data.documents.filter(item => !project || item.projectId === project.id)
  const pendingInvoices = invoices.filter(item => invoiceBalance(item) > 0 && (item.status === "sent" || item.status === "overdue"))
  const pendingEstimates = estimates.filter(item => item.status === "sent")
  const pendingContracts = contracts.filter(item => item.status === "sent")
  const pendingDocuments = documents.filter(item => item.status === "sent")
  const count = pendingInvoices.length + pendingEstimates.length + pendingContracts.length + pendingDocuments.length
  const myTasks = tasks.filter(item => item.assigneeUid === uid)
  const billingCount = invoices.length + estimates.length + contracts.length
  // Portal mirror rows (projects, tasks) carry no createdAt, so the feed is
  // built from the billing documents and files that do.
  const activity = buildActivity({ invoices, estimates, contracts, documents, files })
  const activityHref = (item: ActivityItem) => item.kind === "file" ? undefined : portalDocumentPath(company, item.kind === "document" ? "document" : item.kind as "invoice" | "estimate" | "contract", item.refId)
  const status = project ? projectStatusMeta[project.status] : null
  const projectTabs = ["overview", "tasks", "documents"]
  const actionLink = (kind: "invoice" | "estimate" | "contract" | "document", id: string, label: string) => <Link href={portalDocumentPath(company, kind, id)} className="shrink-0 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{label}</Link>
  const projectList = <Panel title="Projects" count={data.projects.length}>{data.projects.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">{data.projects.map(item => { const meta = projectStatusMeta[item.status]; return <ProjectCard
    key={item.id}
    project={{ ...item, client: data.organization.name, service: meta?.label || item.status }}
    href={`${portalPath(company)}/projects/${encodeURIComponent(item.id)}`}
    subtitle={`${meta?.label || item.status}${item.dueDate ? ` · Due ${shortDate(item.dueDate)}` : ""}`}
    footer={<span className="text-xs tabular-nums text-muted-foreground">{Math.max(0, Math.min(100, item.progress || 0))}% complete</span>}
  /> })}</div> : <Empty>Your agency will share projects here when they’re ready for you.</Empty>}</Panel>
  return <PortalShellLayout company={company} organization={data.organization} activeTab={project ? "projects" : tab} title={project ? data.organization.name : tab}>
    {project && <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground"><Link href={portalPath(company)} className="inline-flex items-center gap-2 rounded-sm hover:text-foreground focus-visible:outline focus-visible:outline-2"><ArrowLeft className="size-3.5" />{data.organization.name}</Link>{project.dueDate && <span className="inline-flex items-center gap-2"><CalendarDays className="size-3.5" />Due {shortDate(project.dueDate)}</span>}</div>
    <div className="mb-5 min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</h1><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900"><span className="size-1.5 rounded-full bg-emerald-700" />{Math.max(0, Math.min(100, project.progress || 0))}% complete</span></div>{(project.summary || status?.label) && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{project.summary || status?.label}</p>}</div>
    <nav aria-label="Project sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">{projectTabs.map(item => <button key={item} onClick={() => onTab(item)} aria-current={tab === item ? "page" : undefined} className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${tab === item ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</nav>
    </>}
    {tab === "overview" &&<div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]"><div className="space-y-6"><Panel title="Outstanding items" count={count}>{count ? <ul className="divide-y divide-border">
      {pendingInvoices.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"><Receipt className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Invoice {item.invoiceNumber}</p><p className="mt-1 text-xs text-muted-foreground">{formatMoney(invoiceBalance(item), item.currency)} outstanding{item.dueOn ? ` · Due ${shortDate(item.dueOn)}` : ""}</p></div>{actionLink("invoice", item.id, "View invoice")}</li>)}
      {pendingEstimates.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Review {item.title || item.estimateNumber}</p><p className="mt-1 text-xs text-muted-foreground">Estimate awaiting your response</p></div>{actionLink("estimate", item.id, "View estimate")}</li>)}
      {pendingContracts.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Review {item.title}</p><p className="mt-1 text-xs text-muted-foreground">Contract awaiting signature</p></div>{actionLink("contract", item.id, "View contract")}</li>)}
      {pendingDocuments.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Read {item.title}</p><p className="mt-1 text-xs text-muted-foreground">{companyDocumentKindMeta[item.kind]?.label ?? "Document"} shared with you</p></div>{actionLink("document", item.id, "View document")}</li>)}
    </ul> : <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground"><Check className="size-4 text-emerald-700" />You’re all caught up on documents.</div>}</Panel>{!project && data.projects.length > 0 && projectList}{myTasks.length > 0 && <Tasks tasks={tasks} uid={uid} canAct={canAct} onChanged={onChanged} />}{invoices.length > 0 && <BillingSummary invoices={invoices} onView={() => window.document.getElementById("portal-documents")?.scrollIntoView({ behavior: "smooth" })} />}{billingCount > 0 && <div id="portal-documents"><BillingDocuments company={company} invoices={invoices} contracts={contracts} estimates={estimates} /></div>}</div><div className="space-y-6"><ActivityPanel items={activity} hrefFor={activityHref} />{files.length > 0 && <Files files={files} />}</div></div>}
    {tab === "projects" && projectList}
    {tab === "contacts" && <Contacts people={data.organization.publicTeam ?? []} />}
    {tab === "tasks" && <Tasks tasks={tasks} uid={uid} canAct={canAct} onChanged={onChanged} all />}
    {tab === "documents" && <div className="space-y-6"><CompanyDocuments company={company} documents={documents} /><Files files={files} /></div>}
    {tab === "media" && <CompanyMedia logoUrl={data.organization.logoUrl} projects={data.projects as unknown as Project[]} uploaded={data.organization.media ?? []} />}
    {tab === "insights" && (publicView ? <Panel title="Insights"><SignInPrompt action="to see insights for your company" /></Panel> : <PortalInsights />)}
    {tab === "ngai" && (publicView ? <Panel title="Ngai"><SignInPrompt action="to chat with Ngai" /></Panel> : <PortalNgai />)}
    {tab === "account" && <About organization={data.organization} />}
  </PortalShellLayout>
}

export function PortalWorkspace({ projectMode = false, section }: { projectMode?: boolean; section?: string }) {
  const data = usePortal()
  const { appUser, isAdmin } = useAuth()
  const { companySlug, projectId } = useParams<{ companySlug: string; projectId?: string }>()
  const pathname = usePathname()
  const search = useSearchParams()
  const router = useRouter()
  const project = projectMode ? data.projects.find(item => item.id === projectId || item.legacySlug === projectId) : undefined
  const available = projectMode ? ["overview", "tasks", "documents"] : ["overview", "projects", "contacts", "tasks", "documents", "media", "insights", "ngai", "account"]
  const raw = section || search.get("tab") || "overview"
  const tab = available.includes(raw) ? raw : "overview"
  if (projectMode && !project) return <PortalNotice title="This project isn’t available">It may not have been shared with your company yet. <Link className="underline" href={portalPath(companySlug)}>Back to your company</Link></PortalNotice>
  return <PortalWorkspaceView data={data} project={project} company={companySlug} uid={appUser?.uid || ""} canAct={!isAdmin && !data.publicView} tab={tab} onTab={value => router.push(`${pathname}${value === "overview" ? "" : `?tab=${value}`}`, { scroll: false })} onChanged={data.reload} />
}
