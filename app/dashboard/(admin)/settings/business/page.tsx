"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"

// The business profile now lives under the account settings tabs. This keeps
// old links and bookmarks working by forwarding to the new home.
export default function BusinessSettingsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/account/business")
  }, [router])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <DashboardPageSkeleton variant="form" rows={5} />
    </main>
  )
}
