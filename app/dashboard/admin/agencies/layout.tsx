import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Agency management" }

export default function AgencyOperationsLayout({ children }: { children: ReactNode }) {
  return children
}
