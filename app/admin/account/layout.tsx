import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AccountSlide } from "@/components/account/account-slide"

export const metadata: Metadata = { title: "Account" }

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountSlide>{children}</AccountSlide>
}
