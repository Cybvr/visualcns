import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { CompanySection } from "@/components/company/sections/company-section"
import { isCompanySection } from "@/components/company/company-sections"
import { publicProjectsMetadata } from "@/lib/server/page-metadata"

// The layout can't see the query string, so shared campaign and post links get their preview here.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ clientSlug: string; section: string }>
  searchParams: Promise<{ campaign?: string | string[]; post?: string | string[] }>
}): Promise<Metadata> {
  const { clientSlug, section } = await params
  if (section !== "projects") return {}
  const { campaign, post } = await searchParams
  const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)
  const path = `/${encodeURIComponent(clientSlug)}/projects`
  const requestHeaders = await headers()
  return publicProjectsMetadata(clientSlug, section, path, { campaign: first(campaign), post: first(post) }, requestHeaders.get("x-agency-subdomain") || "")
}

export default async function CompanySectionPage({ params, searchParams }: { params: Promise<{ clientSlug: string; section: string }>; searchParams: Promise<{ doc?: string; task?: string }> }) {
  const { clientSlug, section } = await params
  const { doc, task } = await searchParams
  if (section === "drive") redirect(`/${encodeURIComponent(clientSlug)}/projects`)
  if (section === "tasks") redirect(`/${encodeURIComponent(clientSlug)}/projects${task ? `?task=${encodeURIComponent(task)}` : ""}`)
  if (section === "brand-health") redirect(`/${encodeURIComponent(clientSlug)}/pulse`)
  if (section === "activity") redirect(`/${encodeURIComponent(clientSlug)}/notifications`)
  if (section === "team") redirect(`/${encodeURIComponent(clientSlug)}`)
  if (section === "media" || section === "documents") redirect(doc && !doc.startsWith("document:") ? `/${encodeURIComponent(clientSlug)}/finance?doc=${encodeURIComponent(doc)}` : `/${encodeURIComponent(clientSlug)}/projects`)
  if (section === "about") redirect(`/${encodeURIComponent(clientSlug)}/settings`)
  if (section === "notifications") return <CompanySection section="activity" />
  if (!isCompanySection(section)) redirect(`/${encodeURIComponent(clientSlug)}`)
  return <CompanySection section={section} />
}
