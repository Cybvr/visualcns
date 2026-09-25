import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "App settings" }

export default function CustomizationLayout({ children }: { children: ReactNode }) {
  return children
}
