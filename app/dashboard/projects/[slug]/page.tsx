"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { getInvoicesByCompanyId, getPublicInvoicesByCompanyId, type Invoice } from "@/lib/billing"
import { getOrganization } from "@/lib/organizations"
import { readPageCache, useCachedState } from "@/lib/page-cache"
import { getProjectBySlug, projectSlug, type Project } from "@/lib/projects"

/** Goes back a step in history, falling back to the dashboard on a cold open. */
function BackLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back
    </button>
  )
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ""
  const router = useRouter()
  const { user, appUser, isAdmin } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const clientName = appUser?.company || appUser?.displayName || ""

  // Opened from the campaigns list, the campaign is already in memory, so it shows at once.
  const [project, setProject, cached] = useCachedState<Project | null>(
    `project:${slug}`,
    readPageCache<Project[]>("projects")?.find((item) => projectSlug(item) === slug) ?? null,
  )
  const [invoices, setInvoices] = useCachedState<Invoice[]>(`project-invoices:${slug}`, [])
  const [clientLogoUrl, setClientLogoUrl] = useState<string>()
  const [companySlug, setCompanySlug] = useState<string>()
  const [loading, setLoading] = useState(!cached && !project)
  const [error, setError] = useState(false)

  usePageTitle(project?.title ?? null)

  // The client's logo, shown as the poster on the campaign's posts.
  const projectCompanyId = project?.companyId
  useEffect(() => {
    if (!projectCompanyId) return
    let active = true
    getOrganization(projectCompanyId)
      .then((organization) => {
        if (!active) return
        setClientLogoUrl(organization?.logoUrl || undefined)
        setCompanySlug(organization?.slug || undefined)
      })
      .catch(() => {})
    return () => { active = false }
  }, [projectCompanyId])

  const fetchProject = useCallback(async () => {
    if (!slug) return
    setError(false)
    try {
      const found = await getProjectBySlug(slug)
      setProject(found)
      if (found) {
        const rows = await (isAdmin ? getInvoicesByCompanyId(found.companyId, true) : getPublicInvoicesByCompanyId(found.companyId)).catch(() => [])
        setInvoices(rows.filter((invoice) => invoice.projectId === found.id))
      } else {
        setInvoices([])
      }
    } catch (err) {
      console.error("Error loading project:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, slug])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const handleProjectPatched = useCallback((patch: Partial<Project>) => {
    setProject((current) => (current ? { ...current, ...patch } : current))
    // The page is addressed by slug, so a renamed project moves
    // the URL with it rather than leaving a stale address.
    if (patch.slug && patch.slug !== slug) router.replace(`/dashboard/projects/${patch.slug}`)
  }, [router, slug])

  if (!user) return null

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <DashboardPageSkeleton variant="detail" />
      </main>
    )
  }

  // A client should only ever reach their own projects, even by typing a slug.
  const forbidden = project !== null && !isAdmin && project.companyId !== companyId

  if (error || !project || forbidden) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <BackLink />
        <p className="mt-8 text-sm text-muted-foreground">
          {error
            ? "Couldn't load this project right now. Please try again shortly."
            : "That project doesn't exist, or you don't have access to it."}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <ProjectDetail
        project={project}
        isAdmin={isAdmin}
        companyId={companyId}
        companySlug={companySlug}
        clientName={clientName}
        clientLogoUrl={clientLogoUrl}
        invoices={invoices}
        onProjectPatched={handleProjectPatched}
        onProjectDeleted={() => router.push("/dashboard/projects")}
        // One step back, wherever the campaign was opened from; the campaigns list on a cold open.
        onBack={() => (window.history.length > 1 ? router.back() : router.push("/dashboard/projects"))}
        backLabel="Back"
      />
    </main>
  )
}
