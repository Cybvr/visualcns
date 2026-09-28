import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AuthProvider } from "@/components/auth-provider"

export const metadata: Metadata = { title: "Visitor sign-in demo" }

// Sign-in is needed for the Get started modal.
export default function VisitorsDemoLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
