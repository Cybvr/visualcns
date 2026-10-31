import { redirect } from "next/navigation"

/** Services moved to Pricing. */
export default async function CompanyServicesPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params
  redirect(`/${encodeURIComponent(clientSlug)}/pricing`)
}
