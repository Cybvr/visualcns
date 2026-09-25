"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getOrganization, organizationRef } from "@/lib/organizations"
import { PortalLoading, PortalNotice } from "./portal-shell"

export function LegacyClientRedirect() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    if (!appUser?.companyId) { setFailed(true); return }
    getOrganization(appUser.companyId).then(org => {
      if (!active) return
      if (org) router.replace(`/${encodeURIComponent(organizationRef(org))}`)
      else setFailed(true)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [appUser?.companyId, router])
  return failed ? <PortalNotice title="This client has no linked workspace"><p>Link this account to a company before previewing it.</p></PortalNotice> : <PortalLoading />
}
