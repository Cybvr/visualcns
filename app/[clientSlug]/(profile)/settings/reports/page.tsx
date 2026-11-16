import { redirect } from "next/navigation"

/** Reports moved to Marketing; old links land there. Opening one report (?report=) goes to Insights. */
export default async function CompanyReportsPage({ params, searchParams }: { params: Promise<{ clientSlug: string }>; searchParams: Promise<{ report?: string }> }) {
  const { clientSlug } = await params
  const { report } = await searchParams
  redirect(`/${encodeURIComponent(clientSlug)}/${report ? "insights" : "marketing"}`)
}
