"use client"

import { createContext } from "react"

import type { ArtifactRef } from "@/components/dashboard/document-artifact"

/** Set by the Ngai workspace: opening an item from the chat (a card or a link) shows it beside the chat, in place. */
export const NgaiOpenItemContext = createContext<((artifact: ArtifactRef) => void) | null>(null)

/** The item a dashboard link points at, if it is one the workspace can open. */
export function itemFromHref(href: string): ArtifactRef | null {
  const url = new URL(href, "http://x")
  const invoice = url.pathname.match(/^\/dashboard\/invoices\/([^/]+)\/?(?:edit\/?)?$/)
  if (invoice && invoice[1] !== "new") return { kind: "invoice", id: decodeURIComponent(invoice[1]) }
  const document = url.pathname === "/dashboard/documents" ? url.searchParams.get("document") : url.pathname.match(/^\/dashboard\/documents\/([^/]+)/)?.[1]
  if (document) return { kind: "document", id: decodeURIComponent(document) }
  const estimate = url.pathname.match(/^\/dashboard\/estimates\/([^/]+)/)
  if (estimate && estimate[1] !== "new") return { kind: "estimate", id: decodeURIComponent(estimate[1]) }
  const contract = url.pathname.match(/^\/dashboard\/contracts\/([^/]+)/)
  if (contract && contract[1] !== "new") return { kind: "contract", id: decodeURIComponent(contract[1]) }
  return null
}
