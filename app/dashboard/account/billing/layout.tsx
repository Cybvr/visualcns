import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Billing" }

export default function BillingLayout({ children }: { children: ReactNode }) {
  return children
}
