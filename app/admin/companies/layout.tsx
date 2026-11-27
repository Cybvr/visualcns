import type { ReactNode } from "react"

import { CrmTabs } from "@/components/dashboard/crm-tabs"

export default function CompaniesLayout({ children }: { children: ReactNode }) {
  return <><CrmTabs />{children}</>
}
