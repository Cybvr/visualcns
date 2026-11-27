import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Invoice" }

export default function InvoiceDetailLayout({ children }: { children: ReactNode }) {
  return children
}
