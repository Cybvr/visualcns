import { redirect } from "next/navigation"

/** Drive is now Artifacts, and invoices have their own page. Old links land in the right place. */
export default async function DrivePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  if (type === "invoice") redirect("/admin/invoices")
  redirect(type ? `/admin/artifacts?type=${encodeURIComponent(type)}` : "/admin/artifacts")
}
