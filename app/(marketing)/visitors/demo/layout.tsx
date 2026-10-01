import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AuthProvider } from "@/components/auth-provider"

export const metadata: Metadata = { title: "Visitor sign-in demo" }

// Sign-in is needed if an existing account opens Visitor Sign-in onboarding.
export default function VisitorsDemoLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
