"use client"

import { Ngai } from "@/components/agent/ngai"
import { useHideMobileFooter } from "@/components/dashboard/page-title-context"

/** Ngai as a full page. New chat and past chats sit in the main sidebar. */
export function NgaiPage() {
  useHideMobileFooter(true)
  return <Ngai scope={{ kind: "app" }} className="sm:px-6" menuInSidebar />
}
