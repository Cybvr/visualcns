"use client"

import { Ngai } from "@/components/agent/ngai"

/** The company's Ngai page. */
export function NgaiSection() {
  return <Ngai scope={{ kind: "company" }} />
}
