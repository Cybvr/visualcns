import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AccountSlide } from "@/components/account/account-slide"

export const metadata: Metadata = { title: "Agency management" }

export default function AgencyOperationsLayout({ children }: { children: ReactNode }) {
  return <AccountSlide>{children}</AccountSlide>
}
