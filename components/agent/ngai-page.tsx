"use client"

import { useRouter } from "next/navigation"

import { Ngai } from "@/components/agent/ngai"
import { useHideMobileFooter } from "@/components/dashboard/page-title-context"

/** Ngai as a full page. On phones it fills the screen: no app header or footer, just its own back arrow. */
export function NgaiPage() {
  const router = useRouter()
  useHideMobileFooter(true)
  return (
    <Ngai
      scope={{ kind: "app" }}
      className="sm:px-6"
      onBack={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
    />
  )
}
