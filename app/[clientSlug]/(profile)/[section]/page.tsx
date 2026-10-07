import { redirect } from "next/navigation"

import { CompanySection } from "@/components/company/sections/company-section"
import { isCompanySection } from "@/components/company/company-sections"

export default async function CompanySectionPage({ params, searchParams }: { params: Promise<{ clientSlug: string; section: string }>; searchParams: Promise<{ doc?: string }> }) {
  const { clientSlug, section } = await params
  const { doc } = await searchParams
  if (section === "brand-health") redirect(`/${encodeURIComponent(clientSlug)}/pulse`)
  if (section === "activity") redirect(`/${encodeURIComponent(clientSlug)}/notifications`)
  if (section === "team") redirect(`/${encodeURIComponent(clientSlug)}`)
  if (section === "media" || section === "documents") redirect(`/${encodeURIComponent(clientSlug)}/drive${doc ? `?doc=${encodeURIComponent(doc)}` : ""}`)
  if (section === "notifications") return <CompanySection section="activity" />
  if (!isCompanySection(section) || section === "about") redirect(`/${encodeURIComponent(clientSlug)}`)
  return <CompanySection section={section} />
}
