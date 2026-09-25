import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Agency operations" }

export default function AgencyOperationsLayout({ children }: { children: ReactNode }) {
  return children
}
