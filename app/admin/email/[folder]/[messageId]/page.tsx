import { notFound } from "next/navigation"

import type { EmailTab } from "@/components/dashboard/email/types"

const FOLDERS: EmailTab[] = ["inbox", "updates", "drafts", "messages", "bin", "templates", "lists"]

export default async function EmailDetailPage({ params }: { params: Promise<{ folder: string; messageId: string }> }) {
  const { folder } = await params
  const initialTab = folder === "sent" ? "messages" : folder
  if (!FOLDERS.includes(initialTab as EmailTab)) notFound()
  // The layout shows the message; this page only turns away folders that don't exist.
  return null
}
