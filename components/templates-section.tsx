"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getTemplates, getTemplateSteps } from "@/lib/projects"
import type { Currency } from "@/lib/plans"
import { TemplateGallery, type TemplateCard } from "@/components/template-gallery"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function TemplatesSection() {
  const [currency, setCurrency] = useState<Currency>("USD")
  const [templates, setTemplates] = useState<TemplateCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const projects = await getTemplates()
        // Steps are the task names on each template, fetched alongside so the
        // dialog can list what the workflow actually contains.
        const withSteps = await Promise.all(
          projects.map(async (project) => ({
            project,
            steps: await getTemplateSteps(project.id),
          })),
        )
        setTemplates(withSteps)
      } catch (error) {
        console.error("Error fetching templates:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Choose currency</p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-muted p-[3px]">
          <button
            type="button"
            className={`rounded-full px-[14px] py-[6px] text-xs font-bold ${
              currency === "USD" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setCurrency("USD")}
          >
            USD
          </button>
          <button
            type="button"
            className={`rounded-full px-[14px] py-[6px] text-xs font-bold ${
              currency === "NGN" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setCurrency("NGN")}
          >
            NGN
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading templates">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-3 rounded-2xl border border-border bg-card p-4"><Skeleton className="aspect-[4/3] w-full rounded-xl" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-lg font-semibold">No templates published yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Templates appear here as soon as a project is made public.
          </p>
        </div>
      ) : (
        <TemplateGallery templates={templates} currency={currency} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-lg font-semibold">Want to build your own?</p>
          <p className="text-sm text-muted-foreground">
            Create a project in your agency, add the steps as tasks, and make it public to list it here.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects">Open your agency</Link>
        </Button>
      </div>
    </div>
  )
}
