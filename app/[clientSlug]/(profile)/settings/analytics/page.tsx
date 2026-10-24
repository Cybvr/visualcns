import { redirect } from "next/navigation"

// Analytics moved out of Settings to its own menu item; old links still work.
export default async function CompanyAnalyticsPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params
  redirect(`/${encodeURIComponent(clientSlug)}/analytics`)
}
