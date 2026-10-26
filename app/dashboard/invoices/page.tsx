import { redirect } from "next/navigation"

/** Old invoice list links now open the shared Drive. Selected links keep their record. */
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams
  redirect(invoice ? `/dashboard/invoices/${encodeURIComponent(invoice)}` : "/dashboard/drive?type=invoice")
}
