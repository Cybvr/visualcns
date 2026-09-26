"use client"

import { useMemo, useState } from "react"
import { ArrowRight, ExternalLink, Printer, RotateCcw } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { BookNowModal } from "@/components/book-now-modal"
import { Button } from "@/components/ui/button"
import type { CompanyLink } from "@/lib/organizations"

type AuditArea = {
  key: string
  label: string
  shortLabel: string
  coverage: number
  detail: string
}

function sourceHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function coverageStatus(value: number) {
  if (value >= 100) return "Ready"
  if (value > 0) return "Partial"
  return "Missing"
}

function nextMove(areas: AuditArea[]) {
  const missing = areas.find((area) => area.coverage === 0)
  if (missing?.key === "website") return "Add the website to see how the brand promise and customer path work together."
  if (missing?.key === "social") return "Add a social profile to compare the story across the places people discover you."
  if (missing?.key === "supporting") return "Add one more public source so the review can check how the brand holds together across touchpoints."
  return "Book a strategy session to turn the strongest signal into a focused next move."
}

function actionFor(area: AuditArea) {
  if (area.key === "website" && area.coverage === 0) return { title: "Add the primary website", detail: "Give the audit a public experience to inspect, then review whether the promise is clear within the first few seconds.", priority: "High" }
  if (area.key === "social" && area.coverage === 0) return { title: "Connect the active social profile", detail: "Compare the message people see on social with the message on the website and company profile.", priority: "High" }
  if (area.key === "foundation" && area.coverage < 100) return { title: "Clarify the company story", detail: "Add a concise description of the offer, audience, and reason to choose the business so the audit has a stronger strategic baseline.", priority: "Medium" }
  if (area.key === "supporting" && area.coverage < 100) return { title: "Add supporting public sources", detail: "Connect the profiles, proof points, and channels that shape how the brand is discovered and trusted.", priority: "Medium" }
  return { title: `Review ${area.label.toLowerCase()}`, detail: "Compare this signal with the other touchpoints and choose one change that will make the customer path easier to understand.", priority: "Medium" }
}

export function BrandHealthCheck({
  companyName,
  description,
  website,
  linkedIn,
  links = [],
}: {
  companyName: string
  description?: string
  website?: string
  linkedIn?: string
  links?: CompanyLink[]
}) {
  const [reportReady, setReportReady] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  function generateReport() {
    setGeneratedAt(new Date())
    setReportReady(true)
  }

  const savedSources = useMemo(() => {
    const values = [
      website ? { label: "Website", url: website } : null,
      linkedIn ? { label: "LinkedIn", url: linkedIn } : null,
      ...links.map((link) => ({ label: link.label, url: link.url })),
    ].filter((source): source is { label: string; url: string } => Boolean(source?.url?.trim()))

    return values.filter((source, index) => values.findIndex((item) => item.url === source.url) === index)
  }, [links, linkedIn, website])

  const report = useMemo(() => {
    const socialSources = savedSources.filter((source) => /instagram|facebook|twitter|x\.com|tiktok|linkedin/i.test(`${source.label} ${source.url}`))
    const areas: AuditArea[] = [
      {
        key: "foundation",
        label: "Brand profile",
        shortLabel: "Brand",
        coverage: description?.trim() ? 100 : companyName.trim() ? 60 : 0,
        detail: description?.trim() ? "Name and company context are available to review." : "A name is available, but the company story is still thin.",
      },
      {
        key: "website",
        label: "Website experience",
        shortLabel: "Website",
        coverage: website?.trim() ? 100 : 0,
        detail: website?.trim() ? "A public website is ready for a closer read." : "No website is saved for this company yet.",
      },
      {
        key: "social",
        label: "Social presence",
        shortLabel: "Social",
        coverage: socialSources.length ? Math.min(100, socialSources.length * 50) : 0,
        detail: socialSources.length ? `${socialSources.length} social source${socialSources.length === 1 ? "" : "s"} available to compare.` : "No social profile is saved for this company yet.",
      },
      {
        key: "supporting",
        label: "Supporting links",
        shortLabel: "Proof",
        coverage: Math.min(100, savedSources.length * 25),
        detail: savedSources.length ? `${savedSources.length} public source${savedSources.length === 1 ? "" : "s"} connected to this profile.` : "Add public sources to widen the review.",
      },
    ]

    return {
      areas,
      coverage: Math.round(areas.reduce((sum, area) => sum + area.coverage, 0) / areas.length),
    }
  }, [companyName, description, savedSources, website])

  if (!reportReady) {
    return (
      <section className="mt-5">
        <div className="grid gap-10 border-y border-border py-7 sm:py-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Brand audit</p>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">Review the public signals behind {companyName}.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Generate a concise report from the company information already available in this workspace.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={generateReport}>
                Generate audit report
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <BookNowModal />
            </div>
          </div>

          <div className="border-t border-border pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sources available</p>
            {savedSources.length > 0 ? (
              <div className="mt-3 divide-y divide-border border-y border-border">
                {savedSources.map((source) => (
                  <a
                    key={`${source.label}-${source.url}`}
                    href={sourceHref(source.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="truncate">{source.label}</span>
                    <ExternalLink className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">No public links are saved yet. The report will show what is available and where more context is needed.</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-5 space-y-5 print:mt-0 print:space-y-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Print report
          </Button>
          <BookNowModal triggerLabel="Book a strategy session" triggerSize="sm" />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setReportReady(false)}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Run again
        </Button>
      </div>

      <div className="border-b border-border pb-6 print:break-inside-avoid">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Brand audit report</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">Where the brand is visible</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A source coverage report for {companyName}. It shows where there is enough public signal to make a useful read.</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Prepared for</p>
            <p className="mt-1 font-medium text-foreground">{companyName}</p>
            {generatedAt && <p className="mt-1 text-xs text-muted-foreground">{generatedAt.toLocaleDateString()}</p>}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-y border-border py-5 sm:border-y-0 sm:border-r sm:pr-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Audit coverage</p>
                <p className="mt-2 text-sm text-muted-foreground">Public sources available to inspect</p>
              </div>
            </div>
            <div className="mt-6 h-1 overflow-hidden bg-muted" aria-hidden="true">
              <div className="h-full bg-foreground transition-[width]" style={{ width: `${report.coverage}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{report.areas.filter((area) => area.coverage > 0).length} of {report.areas.length} audit areas have a public signal.</p>
          </div>

          <div className="min-h-56 py-3 sm:p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={report.areas} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" />
                <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value) => [`${value}%`, "Coverage"]} />
                <Bar dataKey="coverage" fill="#334155" radius={[1, 1, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="py-5 sm:py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Audit areas</h3>
            <p className="mt-1 text-sm text-muted-foreground">The signals currently available for each part of the brand.</p>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{report.areas.length} areas reviewed</span>
        </div>
        <div className="mt-6 divide-y divide-border">
          {report.areas.map((area) => (
            <div key={area.key} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto] sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{area.label}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{coverageStatus(area.coverage)}</span>
                </div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{area.detail}</p>
              </div>
              <div className="h-1 overflow-hidden bg-muted" aria-label={`${area.label}: ${area.coverage}% coverage`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={area.coverage}>
                <div className="h-full bg-foreground" style={{ width: `${area.coverage}%` }} />
              </div>
              <span className="text-right text-sm font-medium text-foreground">{area.coverage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6 print:break-inside-avoid">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Priority actions</h3>
            <p className="mt-1 text-sm text-muted-foreground">A short working list for the next review cycle.</p>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Owner: brand team</span>
        </div>
        <div className="mt-5 divide-y divide-border">
          {report.areas.map((area, index) => {
            const action = actionFor(area)
            return (
              <div key={`${area.key}-action`} className="grid gap-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-start">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Priority {index + 1}</span>
                <div>
                  <p className="font-medium text-foreground">{action.title}</p>
                  <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{action.detail}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{action.priority}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-border pt-5 sm:pt-6">
        <p className="text-sm font-medium text-foreground">Your next move</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{nextMove(report.areas)}</p>
        <div className="mt-5 print:hidden">
          <BookNowModal triggerLabel="Book a strategy session" triggerSize="sm" />
        </div>
      </div>
    </section>
  )
}
