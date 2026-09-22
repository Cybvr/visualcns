import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Agency" }

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return children
}
