import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Tenant operations" }

export default function TenantOperationsLayout({ children }: { children: ReactNode }) {
  return children
}
