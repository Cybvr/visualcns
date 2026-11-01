import type { ReactNode } from "react"

import { AuthProvider } from "@/components/auth-provider"

/** Signed in, a dollar purchase goes to the buyer's own company. */
export default function PricingLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
