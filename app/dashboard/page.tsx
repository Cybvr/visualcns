"use client"

import { Ngai } from "@/components/agent/ngai"

/** The dashboard home is Ngai. The old overview of projects, tasks and activity lives at /dashboard/overview. */
export default function DashboardHomePage() {
  return <Ngai scope={{ kind: "app" }} className="sm:px-6" />
}
