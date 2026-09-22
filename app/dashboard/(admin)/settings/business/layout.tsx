import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Organization Profile" }

export default function BusinessSettingsLayout({ children }: { children: ReactNode }) {
  return children
}
