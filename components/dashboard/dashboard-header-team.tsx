"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { HeaderTeam, type HeaderTeamPerson } from "@/components/company/header-team"
import { getOrganization } from "@/lib/organizations"
import { getUsersByCompanyId } from "@/lib/users"

/**
 * The signed-in user's own workspace as avatars, an invite plus and Share,
 * for the dashboard's top bar on every page.
 */
export function DashboardHeaderTeam() {
  const { appUser } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const [company, setCompany] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [people, setPeople] = useState<HeaderTeamPerson[]>([])

  useEffect(() => {
    setCompany(null)
    setPeople([])
    if (!companyId) return
    let active = true
    Promise.all([getOrganization(companyId), getUsersByCompanyId(companyId)])
      .then(([organization, users]) => {
        if (!active) return
        setCompany({ id: companyId, name: organization?.name || appUser?.company || "Company", slug: organization?.slug || companyId })
        setPeople(users.map((user) => ({ id: user.uid, name: user.displayName || user.email || "Member", email: user.email, photoUrl: user.photoURL })))
      })
      .catch(() => {
        // The group just stays hidden if the workspace can't be loaded.
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  if (!company) return null

  return (
    <HeaderTeam
      company={company}
      people={people}
      canManageTeam
      shareUrl={`${typeof window === "undefined" ? "" : window.location.origin}/${encodeURIComponent(company.slug)}`}
    />
  )
}
