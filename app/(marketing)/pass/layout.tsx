import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "VisualCNS Pass — Enterprise Visitor Management",
  description:
    "Digital visitor check-ins, automated badges, and audit-ready visitor records across all your offices.",
}

export default function PassLayout({ children }: { children: ReactNode }) {
  return children
}
