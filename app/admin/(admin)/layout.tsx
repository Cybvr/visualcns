"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function AdminToolsLayout({ children }: { children: ReactNode }) {
  const { isAdmin, isImpersonating, loading } = useAuth()
  const router = useRouter()

  // While "viewing as" a client, admin tools are off-limits too — the whole
  // dashboard behaves as the client sees it until Exit view.
  useEffect(() => {
    if (!loading && (!isAdmin || isImpersonating)) router.replace("/admin")
  }, [loading, isAdmin, isImpersonating, router])

  if (loading || !isAdmin || isImpersonating) return null
  return children
}
