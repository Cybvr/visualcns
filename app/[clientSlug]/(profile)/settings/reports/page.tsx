import { redirect } from "next/navigation"

/** Reports moved to Marketing; old links land there. */
export default async function CompanyReportsPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params
  redirect(`/${encodeURIComponent(clientSlug)}/marketing`)
}
