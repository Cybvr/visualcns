import { redirect } from "next/navigation"

/** Notes are documents now, with the same id, so an old note link opens that document. */
export default async function NotesPage({ searchParams }: { searchParams: Promise<{ note?: string }> }) {
  const { note } = await searchParams
  redirect(note ? `/dashboard/documents?document=${encodeURIComponent(note)}` : "/dashboard/artifacts?type=document")
}
