"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { NgaiWorkspace } from "@/components/agent/ngai-workspace"

/**
 * A document, open in the one Ngai UI: the chat on the left, the document on the right.
 * The list of documents lives in Artifacts, so with none chosen this goes there.
 */
export default function DocumentsPage() {
  const router = useRouter()
  const param = useSearchParams().get("document") ?? ""
  // The workspace updates the address as items open and close; the page keeps what it started with.
  const [id] = useState(param)

  useEffect(() => {
    if (!id) router.replace("/admin/artifacts?type=document")
  }, [id, router])

  if (!id) return null
  return <NgaiWorkspace initial={{ kind: "document", id }} />
}
