"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { CreatorApplyForm } from "@/components/creator-apply-form"
import { Skeleton } from "@/components/ui/skeleton"
import { campaignSharePath, CREATORS_ROLE, hiresCreators, resolveBrief, resolveOpenings } from "@/lib/campaign-brief"
import { getProject, type Project } from "@/lib/projects"

/** No login required: where a job's Apply button goes. No jobId, or "creators", applies to post. */
export function SharedCampaignApply({ id, jobId = "" }: { id: string; jobId?: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    getProject(id)
      .then((found) => { if (active) setProject(found) })
      .catch(() => { if (active) setProject(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  if (loading) {
    return (
      <main className="dashboard-body min-h-screen bg-background px-4 py-10 font-sans sm:py-16" role="status" aria-label="Loading">
        <div className="mx-auto max-w-2xl space-y-6"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-80 w-full" /></div>
      </main>
    )
  }

  const opening = jobId && jobId !== CREATORS_ROLE ? resolveOpenings(project?.openings).find((item) => item.id === jobId) : undefined
  if (!project || project.isArchived || (opening ? false : (jobId && jobId !== CREATORS_ROLE) || !hiresCreators(project.brief))) {
    return (
      <main className="dashboard-body flex min-h-screen items-center justify-center bg-background px-4 font-sans">
        <p className="text-sm text-muted-foreground">This job isn&apos;t taking applications.</p>
      </main>
    )
  }

  const backHref = campaignSharePath(project.id, jobId || undefined)

  return (
    <main className="dashboard-body min-h-screen bg-background px-4 pt-4 pb-10 font-sans sm:pt-6 sm:pb-16 [&_*]:font-sans">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the job
        </Link>
        <section aria-labelledby="apply-heading" className="space-y-5 rounded-xs bg-card p-5 sm:p-6">
          <div>
            <h1 id="apply-heading" className="text-2xl font-semibold tracking-tight text-foreground">Apply</h1>
            <div className="mt-1 text-sm text-muted-foreground">{opening ? `${opening.title} · ${project.title}` : project.title}</div>
          </div>
          <CreatorApplyForm projectId={project.id} brief={resolveBrief(project.brief)} opening={opening} />
        </section>
      </div>
    </main>
  )
}
