import { redirect } from "next/navigation"

/** Old document list links now open the shared Drive. Selected links keep their record. */
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ document?: string }> }) {
  const { document } = await searchParams
  redirect(document ? `/dashboard/documents/${encodeURIComponent(document)}` : "/dashboard/drive?type=document")
}
