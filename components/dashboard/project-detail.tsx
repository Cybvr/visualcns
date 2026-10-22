"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronDown, DollarSign, FileText, House, Images, ListTodo, Mail, MoreVertical, Palette, Send, Settings, Sparkles, TrendingUp, Users, type LucideIcon } from "lucide-react"

import { AnalyticsSkeleton, AnalyticsView } from "@/components/company/analytics-view"
import { CampaignBrief } from "@/components/dashboard/campaign-brief"
import { addPostMediaToLibrary, CampaignBrandContext, CampaignCreatives } from "@/components/dashboard/campaign-creatives"
import { CampaignHome, type CampaignQuickAction, type CampaignTab } from "@/components/dashboard/campaign-home"
import { CampaignPeople } from "@/components/dashboard/campaign-people"
import { CampaignPayments } from "@/components/dashboard/campaign-payments"
import { CampaignGenerateButton } from "@/components/dashboard/campaign-generate"
import { CampaignSettings } from "@/components/dashboard/campaign-settings"
import { CaseStudyForm } from "@/components/dashboard/case-study-form"
import { Ngai } from "@/components/agent/ngai"
import { QuickEmailComposer } from "@/components/dashboard/email/quick-email-composer"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { ProjectShareButton } from "@/components/dashboard/project-share-button"
import { ProjectTeamPicker } from "@/components/dashboard/project-team-picker"
import { TasksView } from "@/components/dashboard/tasks-view"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useOptionalSidebar } from "@/components/ui/sidebar"
import { useSidebarTakeover } from "@/components/company/sidebar-takeover"
import { watchCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import type { Invoice } from "@/lib/billing"
import { buildEmailComposeHref, siteUrl } from "@/lib/email-composer"
import { deleteProjectWithTasks, renameProject, slugify, type Project } from "@/lib/projects"
import { deleteTask, getTasksByCompanyId, tsToMillis, updateTask, type Task } from "@/lib/tasks"
import { companyPath } from "@/lib/navigation"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { cn } from "@/lib/utils"

const VIEW_FROM_TAB: Record<CampaignTab, string> = { home: "", build: "build", analytics: "analytics", about: "brief", people: "creators", creatives: "content", media: "media", payments: "payments", tasks: "tasks", settings: "settings" }
const TAB_FROM_VIEW: Record<string, CampaignTab> = Object.fromEntries(Object.entries(VIEW_FROM_TAB).map(([tab, view]) => [view, tab as CampaignTab]))

interface ProjectDetailProps {
  project: Project
  isAdmin: boolean
  publicView?: boolean
  companyId?: string
  /** Public company URL segment used for shareable campaign and post links. */
  companySlug?: string
  clientName?: string
  /** The client's logo, shown as the poster on campaign posts. */
  clientLogoUrl?: string
  embedded?: boolean
  onProjectPatched?: (patch: Partial<Project>) => void
  onProjectDeleted?: () => void | Promise<void>
  /** Closes the campaign. On the company page its sections then take over the sidebar, with this as the way back. */
  onBack?: () => void
  /** What the sidebar's back link says. */
  backLabel?: string
  /** Signed-in agency admins on the public page, who can manage people and creatives without the admin view. */
  canEditCampaign?: boolean
  /** The client's own signed-in people, who can edit post text and approve it. */
  canReview?: boolean
  /** Invoices raised for this campaign, and where each one opens. */
  invoices?: Invoice[]
  invoiceHref?: (invoice: Invoice) => string
  /** The job's shared tasks for the public view, which can't edit them. */
  publicTasks?: ReactNode
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** The starting message for sharing a campaign by email: what it is and the link to apply. */
function campaignInviteHtml(title: string, url: string) {
  const name = escapeHtml(title)
  const href = escapeHtml(url)
  return `<p>Hi,</p><p>We're looking for creators for ${name}. You can see the brief and apply here:</p><p><a href="${href}">${href}</a></p>`
}

/**
 * The full single-project workspace: cover, share/view actions, and the
 * Tasks/About tabs for admins on the standalone project workspace. The
 * company Projects tab routes here so the project has one focused surface.
 */
export function ProjectDetail({
  project,
  isAdmin,
  publicView = false,
  companyId = "",
  companySlug,
  clientName = "",
  clientLogoUrl,
  embedded = false,
  onProjectPatched,
  onProjectDeleted,
  onBack,
  backLabel = "Campaigns",
  publicTasks,
  canEditCampaign = isAdmin,
  canReview = false,
  invoices = [],
  invoiceHref,
}: ProjectDetailProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  // Each tab has its own address (?view=creators), so it can be linked, refreshed and gone back to.
  const [view, setView] = useUrlSelection("view")
  const tab = TAB_FROM_VIEW[view ?? ""] ?? "home"
  const setTab = (next: CampaignTab) => setView(next === "home" ? null : VIEW_FROM_TAB[next])
  // Where the campaign keeps its own section menu, the app menu folds to its icon rail while it is open.
  // On the company page the sections move into the sidebar instead, so it stays open.
  const sidebar = useOptionalSidebar()
  const setSidebarOpen = useRef(sidebar?.setOpen)
  setSidebarOpen.current = sidebar?.setOpen
  const foldsSidebar = !onBack
  useEffect(() => {
    if (!foldsSidebar) return
    setSidebarOpen.current?.(false)
    return () => setSidebarOpen.current?.(true)
  }, [foldsSidebar])
  const [people, setPeople] = useState<CampaignPerson[]>([])
  const [peopleLoaded, setPeopleLoaded] = useState(false)

  useEffect(() => {
    setPeopleLoaded(false)
    return watchCampaignPeople(
      project.id,
      (rows) => { setPeople(rows); setPeopleLoaded(true) },
      () => { setPeople([]); setPeopleLoaded(true) },
    )
  }, [project.id])
  const [creatives, setCreatives] = useState<CampaignCreative[]>([])
  const [creativesLoaded, setCreativesLoaded] = useState(false)
  useEffect(() => {
    setCreativesLoaded(false)
    return watchCampaignCreatives(
      project.id,
      (rows) => { setCreatives(rows); setCreativesLoaded(true) },
      () => { setCreatives([]); setCreativesLoaded(true) },
    )
  }, [project.id])
  // Suggested creators wait in Roster matching; everything else counts only the roster.
  const roster = people.filter(onRoster)
  // Content is the written posts; every image, video and link lives in Media, wherever it was first added.
  const contentItems = creatives.filter((item) => item.type === "text")
  const campaignMedia = creatives.filter((item) => item.type !== "text")
  const mediaItems = campaignMedia.filter((item) => item.type !== "folder")
  // Posts saved before their pictures went to Media: copy those over once, when the agency opens the campaign.
  const backfilled = useRef(new Set<string>())
  useEffect(() => {
    if (!creativesLoaded || !canEditCampaign) return
    const scope = { agencyId: project.agencyId, companyId: project.companyId || companyId, projectId: project.id }
    for (const post of contentItems) {
      if (!post.mediaUrl || backfilled.current.has(post.mediaUrl)) continue
      backfilled.current.add(post.mediaUrl)
      void addPostMediaToLibrary(scope, { url: post.mediaUrl, type: post.mediaType === "video" ? "video" : "image" }, mediaItems)
        .catch((error) => console.error("Error adding post media to Media:", error))
    }
  }, [creativesLoaded, canEditCampaign, contentItems, mediaItems, project.agencyId, project.companyId, project.id, companyId])
  const campaignImage = [
    project.imageUrl,
    project.thumbnailUrl,
    project.gallery?.[0],
    project.logoUrl,
    ...mediaItems.filter((item) => item.type === "image").map((item) => item.url),
    ...contentItems.filter((item) => item.mediaType !== "video").map((item) => item.mediaUrl),
  ].find((url): url is string => Boolean(url))
  const publicCompanyRef = companySlug || project.companyId || companyId
  const campaignSharePath = `/${encodeURIComponent(publicCompanyRef)}/projects?campaign=${encodeURIComponent(project.id)}`
  const postSharePath = (post: CampaignCreative) => `${campaignSharePath}&view=content&post=${encodeURIComponent(post.id)}`
  const [shareOpen, setShareOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [quickAction, setQuickAction] = useState<Exclude<CampaignQuickAction, "run"> | null>(null)
  const [runCampaignOpen, setRunCampaignOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleSaving, setTitleSaving] = useState(false)

  function startQuickAction(action: CampaignQuickAction) {
    if (action === "run") {
      setRunCampaignOpen(true)
      return
    }
    setQuickAction(action)
    setTab(action === "creator" ? "people" : action === "post" ? "creatives" : "media")
  }

  useEffect(() => {
    setTitleDraft(project.title)
  }, [project.id, project.title])

  const saveTitle = useCallback(async () => {
    const nextTitle = titleDraft.trim()
    if (!nextTitle || nextTitle === project.title || titleSaving) {
      setTitleDraft(project.title)
      setTitleEditing(false)
      return
    }

    setTitleSaving(true)
    try {
      await renameProject(project.id, nextTitle)
      onProjectPatched?.({ title: nextTitle, slug: slugify(nextTitle) })
      setTitleEditing(false)
    } catch (error) {
      console.error("Error renaming project:", error)
      setTitleDraft(project.title)
    } finally {
      setTitleSaving(false)
    }
  }, [onProjectPatched, project.id, project.title, titleDraft, titleSaving])

  const titleNode = useMemo(
    () => titleEditing ? (
      <input
        autoFocus
        value={titleDraft}
        disabled={titleSaving}
        aria-label="Project name"
        onChange={(event) => setTitleDraft(event.target.value)}
        onBlur={() => void saveTitle()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            void saveTitle()
          }
          if (event.key === "Escape") {
            setTitleDraft(project.title)
            setTitleEditing(false)
          }
        }}
        className="h-9 w-full min-w-0 bg-transparent px-0 text-inherit outline-none placeholder:text-current/60"
      />
    ) : (
      <button
        type="button"
        onClick={() => setTitleEditing(true)}
        title="Rename project"
        className="block max-w-full truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {project.title}
      </button>
    ),
    [project.title, saveTitle, titleDraft, titleEditing, titleSaving],
  )

  // The title, Share and the ⋮ menu sit at the top of the page itself, not in the window header.

  const fetchTasks = useCallback(async () => {
    if (publicView) {
      setTasks([])
      return
    }
    // Tasks are fetched by client and narrowed here, reusing the same query
    // the rest of the dashboard already runs.
    const all = await getTasksByCompanyId(project.companyId)
    const mine = all.filter((task) => task.projectId === project.id)
    mine.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt))
    setTasks(mine)
  }, [project.companyId, project.id, publicView])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteTask(id)
      setTasks((current) => current.filter((task) => task.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handlePatch(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)))
    try {
      await updateTask(id, patch)
    } catch {
      await fetchTasks()
    }
  }

  async function handleDeleteProject() {
    if (!onProjectDeleted) return
    await deleteProjectWithTasks(project.id)
    await onProjectDeleted()
  }

  const headerActions = useMemo(() => {
    if (!isAdmin) return null

    return (
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={() => setEmailOpen(true)} aria-label="Share by email" title="Share by email" className="shrink-0 rounded-full text-foreground hover:bg-muted/50">
          <Mail className="size-[18px]" aria-hidden="true" />
        </Button>
        {emailOpen && (
          <QuickEmailComposer
            open
            onOpenChange={setEmailOpen}
            companyName={project.client || clientName}
            initialSubject={`Apply for the ${project.title} campaign`}
            initialBody={campaignInviteHtml(project.title, siteUrl(`/share/campaigns/${encodeURIComponent(project.id)}`))}
          />
        )}
        <ShareDialog
          path={`/share/campaigns/${encodeURIComponent(project.id)}`}
          title={`Share ${project.title}`}
          shareText={`Apply for the ${project.title} campaign`}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              title="More actions"
              className="flex size-9 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link
                href={buildEmailComposeHref({
                  companyId: project.companyId || companyId,
                  companyName: project.client || clientName,
                  projectId: project.id,
                  projectName: project.title,
                  documentType: "project",
                  documentId: project.id,
                  subject: `${project.title} update`,
                  ctaText: "Open company page",
                  ctaUrl: companyPath(project.companyId || companyId),
                })}
              >
                <Mail className="size-4" aria-hidden="true" />
                Send project update
              </Link>
            </DropdownMenuItem>
            {!publicView && (
              <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                  <Send className="size-4" aria-hidden="true" />
                {project.isPublic ? "Update sharing" : "Share project"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {!publicView && (
          <ProjectShareButton
            project={project}
            stepCount={tasks.length}
            onChanged={fetchTasks}
            open={shareOpen}
            onOpenChange={setShareOpen}
            showTrigger={false}
          />
        )}
      </div>
    )
  }, [campaignSharePath, clientName, companyId, emailOpen, fetchTasks, isAdmin, project, publicView, shareOpen, tasks.length])



  const tasksPanel = (
    <TasksView
      tasks={tasks}
      projects={[project]}
      companyId={project.companyId || companyId}
      clientName={project.client || clientName}
      canDuplicate={isAdmin}
      deleting={deleting}
      onDelete={handleDelete}
      onPatch={handlePatch}
      onSaved={fetchTasks}
    />
  )

  const sections = [
    { key: "home", label: "Home", icon: House },
    { key: "about", label: "About campaign", icon: FileText },
    { key: "people", label: "Creators", count: roster.length, icon: Users },
    { key: "creatives", label: "Content", count: contentItems.length, icon: Palette },
    { key: "media", label: "Media", count: mediaItems.length, icon: Images },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "payments", label: "Payments", icon: DollarSign },
    ...(publicView && !publicTasks ? [] : [{ key: "tasks", label: "Tasks", icon: ListTodo }]),
    ...(embedded && canEditCampaign ? [{ key: "build", label: "Ngai", icon: Sparkles }] : []),
    ...(canEditCampaign ? [{ key: "settings", label: "Settings", icon: Settings }] : []),
  ] as { key: CampaignTab; label: string; count?: number; icon: LucideIcon }[]

  // On the company page the campaign's sections replace the sidebar menu, with a way back to Campaigns.
  const inSidebar = useSidebarTakeover(onBack ? {
    title: project.title,
    backLabel,
    onBack,
    items: sections,
    active: tab,
    onSelect: (key) => setTab(key as CampaignTab),
    // A campaign sits inside a client page, so it wins the sidebar while open.
    level: 2,
  } : null)

  const brand = useMemo(() => ({ name: project.client || clientName, logoUrl: project.logoUrl || clientLogoUrl }), [clientLogoUrl, clientName, project.client, project.logoUrl])

  return (
    <CampaignBrandContext.Provider value={brand}>
    <div className={cn("space-y-2 md:space-y-4", tab === "build" && embedded && canEditCampaign && "md:flex md:h-full md:min-h-0 md:flex-col md:space-y-0")}>
      {!embedded && isAdmin && (
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="surface-record-title min-w-0 flex-1 truncate">{titleNode}</h1>
          {headerActions}
        </div>
      )}
      {isAdmin || publicView ? (
        <div className={cn("flex flex-col gap-2 md:-mb-6 md:flex-row md:gap-8", tab === "build" && embedded && canEditCampaign && "md:min-h-0 md:flex-1")}>
          {/* The row reaches into the card's bottom padding (the content keeps it instead), so the sticky menu isn't pushed up at the end of a long page. */}
          {/* Phones: three main tabs, the rest under More, unless the sidebar already shows them. */}
          {!inSidebar && (
          <nav className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-card md:hidden" aria-label="Campaign sections">
            {sections.slice(0, 3).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                data-active={tab === item.key}
                className="-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-transparent text-[15px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-foreground data-[active=true]:text-foreground"
              >
                {item.label}
                {item.count ? <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span> : null}
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-active={sections.slice(3).some((item) => item.key === tab)}
                  className="-mb-px flex h-10 shrink-0 items-center gap-1 border-b-2 border-transparent text-[15px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-foreground data-[active=true]:text-foreground"
                >
                  {sections.slice(3).find((item) => item.key === tab)?.label ?? "More"}
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {sections.slice(3).map((item) => (
                  <DropdownMenuItem key={item.key} onSelect={() => setTab(item.key)}>
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                    {item.count ? <span className="ml-auto text-xs tabular-nums text-muted-foreground">{item.count}</span> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          )}

          {/* Desktop: the sidebar shows these instead when the campaign has taken it over. */}
          {!inSidebar && (
          <nav className="sticky top-[calc(var(--shell-header-h,0px)+1rem)] z-10 flex w-48 shrink-0 flex-col gap-1 self-start max-md:hidden" aria-label="Campaign sections">
            {sections.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                data-active={tab === item.key}
                /* Same look as the company sidebar. */
                className="flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-left text-sm text-sidebar-foreground outline-none hover:bg-muted hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-primary"
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                {item.count ? <span className="ml-auto pl-2 text-xs tabular-nums text-muted-foreground">{item.count}</span> : null}
              </button>
            ))}
          </nav>
          )}

          <div className={cn("min-w-0 flex-1 md:pb-6", tab === "build" && embedded && canEditCampaign && "md:min-h-0 md:overflow-hidden md:pb-0")}>
            {tab === "home" ? (
              <>
                <CampaignHome
                  content={contentItems}
                  canEdit={canEditCampaign}
                  onOpen={setTab}
                  onAction={startQuickAction}
                  bannerImage={campaignImage}
                  sharePath={`/share/campaigns/${encodeURIComponent(project.id)}`}
                  latestContent={
                    <CampaignCreatives
                      kind="content"
                      limit={4}
                      creatives={contentItems}
                      library={mediaItems}
                      agencyId={project.agencyId}
                      companyId={project.companyId || companyId}
                      projectId={project.id}
                      canEdit={canEditCampaign}
                      canReview={canReview}
                      sharePath={canEditCampaign ? postSharePath : undefined}
                    />
                  }
                />
                {canEditCampaign && (
                  <CampaignGenerateButton
                    project={project}
                    companyName={project.client || clientName}
                    onPatched={onProjectPatched}
                    open={runCampaignOpen}
                    onOpenChange={setRunCampaignOpen}
                    hideTrigger
                  />
                )}
              </>
            ) : tab === "analytics" ? (
              peopleLoaded && creativesLoaded ? (
                <AnalyticsView scope={{ type: "campaign", campaignId: project.id }} people={roster} content={contentItems} invoices={invoices} />
              ) : (
                <AnalyticsSkeleton scope="campaign" />
              )
            ) : tab === "about" ? (
              <CampaignBrief project={project} canEdit={canEditCampaign} onPatched={onProjectPatched} />
            ) : tab === "build" && embedded && canEditCampaign ? (
              <Ngai scope={{ kind: "campaign", campaign: { id: project.id, title: project.title } }} />
            ) : tab === "people" ? (
              <CampaignPeople
                people={people}
                agencyId={project.agencyId}
                companyId={project.companyId || companyId}
                projectId={project.id}
                projectName={project.title}
                canEdit={canEditCampaign}
                canReview={canReview}
                startNew={quickAction === "creator"}
                onActionHandled={() => setQuickAction(null)}
              />
            ) : tab === "creatives" || tab === "media" ? (
              <CampaignCreatives
                key={tab}
                kind={tab === "media" ? "media" : "content"}
                creatives={tab === "media" ? campaignMedia : contentItems}
                library={mediaItems}
                agencyId={project.agencyId}
                companyId={project.companyId || companyId}
                projectId={project.id}
                canEdit={canEditCampaign}
                canReview={canReview}
                sharePath={canEditCampaign ? postSharePath : undefined}
                startNew={quickAction === "post" || quickAction === "media"}
                onActionHandled={() => setQuickAction(null)}
              />
            ) : tab === "payments" ? (
              <CampaignPayments
                people={roster}
                invoices={invoices}
                canEdit={canEditCampaign}
                invoiceHref={invoiceHref}
              />
            ) : tab === "settings" ? (
              <div className="space-y-10">
                <CampaignSettings project={project} library={mediaItems} onPatched={onProjectPatched} />
                {isAdmin && (
                  <div className="max-w-2xl space-y-6 border-t border-border pt-8">
                    <ProjectTeamPicker project={project} onPatched={onProjectPatched} />
                    <CaseStudyForm project={project} onSaved={onProjectPatched} onDelete={handleDeleteProject} />
                  </div>
                )}
              </div>
            ) : (
              publicView ? publicTasks : tasksPanel
            )}
          </div>
        </div>
      ) : (
        <div className="min-w-0">{tasksPanel}</div>
      )}
    </div>
    </CampaignBrandContext.Provider>
  )
}
