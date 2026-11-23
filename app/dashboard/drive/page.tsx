import { redirect } from "next/navigation"

/** Drive is now Artifacts, and invoices have their own page. Old links land in the right place. */
export default async function DrivePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  if (type === "invoice") redirect("/dashboard/invoices")
  redirect(type ? `/dashboard/artifacts?type=${encodeURIComponent(type)}` : "/dashboard/artifacts")
}
