import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"

import { EmailRouteWorkspace } from "@/components/dashboard/email/email-route-workspace"

export const metadata: Metadata = { title: "Email" }

// The workspace is rendered here rather than in each page so opening a message or switching folder keeps it, and its loaded mail, in place.
export default function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>
        <EmailRouteWorkspace />
      </Suspense>
      {children}
    </>
  )
}
