import { notFound } from "next/navigation"

import { EmailWorkspace } from "@/components/dashboard/email/email-workspace"
import type { EmailTab } from "@/components/dashboard/email/types"

const FOLDERS: EmailTab[] = ["inbox", "updates", "drafts", "messages", "bin", "templates", "lists"]

export default async function EmailDetailPage({ params }: { params: Promise<{ folder: string; messageId: string }> }) {
  const { folder, messageId } = await params
  const initialTab = folder === "sent" ? "messages" : folder
  if (!FOLDERS.includes(initialTab as EmailTab)) notFound()
  return <EmailWorkspace initialTab={initialTab as EmailTab} initialMessageId={decodeURIComponent(messageId)} />
}
