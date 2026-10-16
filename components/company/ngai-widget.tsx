"use client"

import { useEffect, useState } from "react"

import { Ngai } from "@/components/agent/ngai"
import { useCompanyPage } from "@/components/company/company-page-context"

/** Opens or closes the Ngai panel from anywhere on a company page. */
const TOGGLE_EVENT = "ngai:toggle"

function useNgaiAvailable() {
  const { section } = useCompanyPage()
  // The Ngai section already is the chat.
  return section !== "ngai"
}

/** Ngai on company pages: a floating panel opened from the header icon. */
export function NgaiWidget() {
  const available = useNgaiAvailable()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const toggle = () => setOpen((current) => !current)
    window.addEventListener(TOGGLE_EVENT, toggle)
    return () => window.removeEventListener(TOGGLE_EVENT, toggle)
  }, [])

  if (!available || !open) return null

  return (
    <div
      role="dialog"
      aria-label="Ngai"
      className="fixed inset-0 z-50 flex flex-col print:hidden sm:inset-auto sm:bottom-20 sm:right-5 sm:h-[min(38rem,calc(100svh-7rem))] sm:w-[26rem] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-xl"
    >
      <Ngai scope={{ kind: "company" }} layout="panel" onClose={() => setOpen(false)} />
    </div>
  )
}
