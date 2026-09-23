"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { getProjectBySlug, type Project } from "@/lib/projects"

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

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  usePageTitle(project?.title ?? null)

  const fetchProject = useCallback(async () => {
    if (!slug) return
    setError(false)
    try {
      const found = await getProjectBySlug(slug)
      setProject(found)
    } catch (err) {
      console.error("Error loading project:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

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
        clientName={clientName}
        onProjectPatched={handleProjectPatched}
        onProjectDeleted={() => router.push("/dashboard/projects")}
      />
    </main>
  )
}
