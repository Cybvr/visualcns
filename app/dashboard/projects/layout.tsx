import type { Metadata } from "next"
import type { ReactNode } from "react"

import { CrmTabs } from "@/components/dashboard/crm-tabs"

export const metadata: Metadata = { title: "Campaigns" }

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <><CrmTabs />{children}</>
}
