"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { NgaiWorkspace, parseOpenParam } from "@/components/agent/ngai-workspace"

/** Ngai as a full page: the one Ngai UI. ?open= brings back the item that was open beside the chat. */
export function NgaiPage() {
  const param = useSearchParams().get("open")
  // The workspace updates the address as items open and close; the page keeps what it started with.
  const [initial] = useState(() => parseOpenParam(param))
  return <NgaiWorkspace initial={initial} />
}
