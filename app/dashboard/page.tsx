"use client"

import { useEffect } from "react"

import { Ngai } from "@/components/agent/ngai"
import { useDashboardEntryReady } from "@/components/dashboard/dashboard-entry-context"
import { useHideMobileFooter } from "@/components/dashboard/page-title-context"

/** Home is a new Ngai chat. Past chats are listed in the sidebar. */
export default function DashboardPage() {
  const markDashboardEntryReady = useDashboardEntryReady()
  useHideMobileFooter(true)

  useEffect(() => {
    markDashboardEntryReady?.()
  }, [markDashboardEntryReady])

  return <Ngai scope={{ kind: "app" }} className="sm:px-6" menuInSidebar />
}
