import { redirect } from "next/navigation"

/** Social connections moved to Marketing Settings. */
export default async function CompanySocialSettingsPage({ params, searchParams }: { params: Promise<{ clientSlug: string }>; searchParams: Promise<{ social?: string }> }) {
  const { clientSlug } = await params
  const { social } = await searchParams
  redirect(`/${encodeURIComponent(clientSlug)}/marketing-settings${social ? `?social=${encodeURIComponent(social)}` : ""}`)
}
