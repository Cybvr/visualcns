"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { PortalLoading, PortalNotice } from "@/components/portal/portal-shell"
import { getOrganization, organizationRef } from "@/lib/organizations"

export default function PortalEntry() {
  const { appUser, isAdmin, isImpersonating } = useAuth()
  const router = useRouter()
  const [state, setState] = useState("loading")
  useEffect(() => {
    let active = true
    if (isAdmin && !isImpersonating) { setState("admin"); return }
    if (!appUser?.companyId) { setState("missing"); return }
    getOrganization(appUser.companyId).then(org => {
      if (!active) return
      if (org) router.replace(`/${encodeURIComponent(organizationRef(org))}`)
      else setState("missing")
    }).catch(() => { if (active) setState("error") })
    return () => { active = false }
  }, [appUser?.companyId, isAdmin, isImpersonating, router])
  if (state === "loading") return <PortalLoading />
  if (state === "admin") return <PortalNotice title="Choose a client to preview"><p>Open a client and select their company page to manage sharing or preview it.</p><Link className="mt-5 inline-block font-medium text-foreground underline underline-offset-4" href="/dashboard/clients">Go to clients</Link></PortalNotice>
  return <PortalNotice title={state === "error" ? "We couldn’t load your workspace" : "Your workspace isn’t ready yet"}><p>{state === "error" ? "Check your connection and refresh to try again." : "Ask your agency to link this account to your company. Use the email they invited."}</p></PortalNotice>
}
