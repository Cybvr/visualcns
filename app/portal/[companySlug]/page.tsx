import { redirect } from "next/navigation"

export default async function CompanyPortalPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params
  redirect(`/${encodeURIComponent(companySlug)}`)
}
