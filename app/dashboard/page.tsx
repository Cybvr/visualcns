"use client"

import { useEffect } from "react"

import { NgaiPage } from "@/components/agent/ngai-page"
import { useDashboardEntryReady } from "@/components/dashboard/dashboard-entry-context"

/** Home is Ngai: a new chat, and anything it brings up opens beside it. Past chats are in the sidebar. */
export default function DashboardPage() {
  const markDashboardEntryReady = useDashboardEntryReady()

  useEffect(() => {
    markDashboardEntryReady?.()
  }, [markDashboardEntryReady])

  return <NgaiPage />
}
