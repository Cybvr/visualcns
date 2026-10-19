import { EmailWorkspace } from "@/components/dashboard/email/email-workspace"
import type { EmailTab } from "@/components/dashboard/email/types"

export function EmailFolderPage({ folder }: { folder: EmailTab }) {
  return <EmailWorkspace initialTab={folder} />
}
