import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Business profile" }

export default function AccountBusinessLayout({ children }: { children: ReactNode }) {
  return children
}
