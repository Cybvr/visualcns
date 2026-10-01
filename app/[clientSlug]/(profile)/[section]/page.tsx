import { redirect } from "next/navigation"

import { CompanySection } from "@/components/company/sections/company-section"
import { isCompanySection } from "@/components/company/company-sections"

export default async function CompanySectionPage({ params }: { params: Promise<{ clientSlug: string; section: string }> }) {
  const { clientSlug, section } = await params
  if (section === "activity") redirect(`/${encodeURIComponent(clientSlug)}/notifications`)
  if (section === "notifications") return <CompanySection section="activity" />
  if (!isCompanySection(section) || section === "about") redirect(`/${encodeURIComponent(clientSlug)}`)
  return <CompanySection section={section} />
}
