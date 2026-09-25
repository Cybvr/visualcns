"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { createProjectFromTemplate, getTemplates, getTemplateSteps, projectSlug, type Project } from "@/lib/projects"
import { TemplateGallery, type TemplateCard } from "@/components/template-gallery"

/**
 * Published templates a client can copy into their own workspace. Same cards
 * and dialog as the public page, with an extra action in the dialog that does
 * the copy - clicking a card only opens it, it never creates anything.
 */
export function TemplatesView({
  companyId,
  clientName,
  onCreated,
}: {
  companyId: string
  clientName: string
  onCreated: () => Promise<void>
}) {
  const { isAdmin, isImpersonating } = useAuth()
  const adminView = isAdmin && !isImpersonating
  const [templates, setTemplates] = useState<TemplateCard[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchTemplates() {
      try {
        const published = await getTemplates()
        const withSteps = await Promise.all(
          published.map(async (project) => ({
            project,
            steps: await getTemplateSteps(project.id),
          })),
        )
        if (!cancelled) setTemplates(withSteps)
      } catch (caughtError) {
        console.error("Error loading templates:", caughtError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTemplates()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleUse(template: Project) {
    if (!companyId) {
      setError("This account is not connected to a company yet.")
      return
    }

    setApplying(template.id)
    setError(null)
    try {
      await createProjectFromTemplate(template, companyId, clientName || "Client company")
      await onCreated()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The template could not be copied. Try again.")
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <section className="mt-4">
        <h2 className="text-xs font-medium text-muted-foreground">Templates</h2>
        <div className="mt-2"><DashboardPageSkeleton rows={3} /></div>
      </section>
    )
  }

  if (templates.length === 0) return null

  return (
    <section id="templates" className="mt-4 scroll-mt-20">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">Templates</h2>
        <span className="text-xs font-medium text-muted-foreground">{templates.length}</span>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4">
        <TemplateGallery
          templates={templates}
          currency="NGN"
          onUse={adminView ? undefined : handleUse}
          applyingId={applying}
          projectHref={adminView ? (project) => `/dashboard/projects/${projectSlug(project)}` : undefined}
        />
      </div>
    </section>
  )
}
