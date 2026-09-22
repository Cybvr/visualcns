import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Email" }

export default function EmailLayout({ children }: { children: ReactNode }) {
  return children
}
