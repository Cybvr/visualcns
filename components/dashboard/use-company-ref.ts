"use client"

import { useEffect, useState } from "react"

import { getOrganization, organizationRef } from "@/lib/organizations"

/**
 * The URL segment (slug) for a company, for links to its public page. Records
 * only store the company id, so this looks the company up. Empty until it has
 * loaded, and the id itself if the company can't be found.
 */
export function useCompanyRef(companyId: string | undefined, enabled = true) {
  const [ref, setRef] = useState("")

  useEffect(() => {
    setRef("")
    if (!enabled || !companyId) return
    let active = true
    getOrganization(companyId)
      .then((organization) => { if (active) setRef(organization ? organizationRef(organization) : companyId) })
      .catch(() => { if (active) setRef(companyId) })
    return () => { active = false }
  }, [companyId, enabled])

  return ref
}
