import { redirect } from "next/navigation"

/** Invoices live in Artifacts now. Old ?invoice= links still open that invoice. */
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams
  redirect(invoice ? `/admin/invoices/${encodeURIComponent(invoice)}` : "/admin/artifacts")
}
