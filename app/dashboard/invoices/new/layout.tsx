import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "New Invoice" }

export default function NewInvoiceLayout({ children }: { children: ReactNode }) {
  return children
}
