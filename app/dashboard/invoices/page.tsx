import { redirect } from "next/navigation"

import { DriveLibrary } from "@/components/dashboard/drive-library"

/** Invoices have their own page. Old ?invoice= links still open that invoice. */
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams
  if (invoice) redirect(`/dashboard/invoices/${encodeURIComponent(invoice)}`)
  return <DriveLibrary mode="invoices" />
}
