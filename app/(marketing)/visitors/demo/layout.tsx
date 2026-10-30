import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AuthProvider } from "@/components/auth-provider"

export const metadata: Metadata = publicPageMetadata({
  title: "Visitor sign-in demo | VisualCNS",
  description: "Try VisualCNS Pass visitor sign-in for your front desk.",
  path: "/visitors/demo",
})

// Sign-in is needed if an existing account opens Visitor Sign-in onboarding.
export default function VisitorsDemoLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
