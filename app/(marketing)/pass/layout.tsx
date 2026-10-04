import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "VisualCNS Pass — Visitor Sign-in",
  description:
    "Visitor sign-in for your front desk. Guests sign in on a tablet or phone, hosts get told, and every visit is kept on record.",
}

export default function PassLayout({ children }: { children: ReactNode }) {
  return children
}
