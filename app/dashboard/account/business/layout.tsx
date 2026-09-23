import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Organization" }

export default function AccountBusinessLayout({ children }: { children: ReactNode }) {
  return children
}
