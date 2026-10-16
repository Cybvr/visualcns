"use client"

import { Ngai } from "@/components/agent/ngai"

/** Full-page Ngai surface for the dashboard navigation link. */
export default function AgentPage() {
  return <Ngai scope={{ kind: "app" }} className="sm:px-6" />
}
