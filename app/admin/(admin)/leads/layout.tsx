import type { Metadata } from "next"
import type { ReactNode } from "react"

import { CrmTabs } from "@/components/dashboard/crm-tabs"

export const metadata: Metadata = { title: "Leads" }

export default function LeadsLayout({ children }: { children: ReactNode }) {
  return <><CrmTabs />{children}</>
}
