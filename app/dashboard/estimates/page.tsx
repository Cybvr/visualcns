import { redirect } from "next/navigation"

/** Old estimate list links now open Drive. Selected links keep their record. */
export default async function EstimatesPage({ searchParams }: { searchParams: Promise<{ estimate?: string }> }) {
  const { estimate } = await searchParams
  redirect(estimate ? `/dashboard/estimates/${encodeURIComponent(estimate)}/edit` : "/dashboard/drive?type=estimate")
}
