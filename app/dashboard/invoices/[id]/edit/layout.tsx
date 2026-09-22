import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Edit Invoice" }

export default function EditInvoiceLayout({ children }: { children: ReactNode }) {
  return children
}
