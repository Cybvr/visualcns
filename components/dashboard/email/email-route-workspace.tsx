"use client"

import { usePathname } from "next/navigation"

import { EmailWorkspace } from "@/components/dashboard/email/email-workspace"
import type { EmailTab } from "@/components/dashboard/email/types"

const FOLDERS: EmailTab[] = ["inbox", "updates", "drafts", "messages", "bin", "templates", "lists"]

/** The Email page for whatever folder and message the URL names. It lives in the layout, so moving between them doesn't reload it. */
export function EmailRouteWorkspace() {
  const [, , , folder = "inbox", messageId] = usePathname().split("/")
  const tab = folder === "sent" ? "messages" : folder
  return (
    <EmailWorkspace
      initialTab={FOLDERS.includes(tab as EmailTab) ? tab as EmailTab : "inbox"}
      initialMessageId={messageId ? decodeURIComponent(messageId) : undefined}
    />
  )
}
