import type { Metadata } from "next"
import type { ReactNode } from "react"

import { CrmTabs } from "@/components/dashboard/crm-tabs"

export const metadata: Metadata = { title: "Schedules" }

export default function SchedulesLayout({ children }: { children: ReactNode }) {
  return <><CrmTabs />{children}</>
}
