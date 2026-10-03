import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Leads" }

export default function LeadsLayout({ children }: { children: ReactNode }) {
  return children
}
