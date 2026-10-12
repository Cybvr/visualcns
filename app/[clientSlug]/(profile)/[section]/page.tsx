import { redirect } from "next/navigation"

import { CompanySection } from "@/components/company/sections/company-section"
import { isCompanySection } from "@/components/company/company-sections"

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
