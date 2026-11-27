import { redirect } from "next/navigation"

/** Notes are documents now, with the same id, so an old note link opens that document. */
export default async function NotesPage({ searchParams }: { searchParams: Promise<{ note?: string }> }) {
  const { note } = await searchParams
  redirect(note ? `/admin/documents?document=${encodeURIComponent(note)}` : "/admin/artifacts?type=document")
}
