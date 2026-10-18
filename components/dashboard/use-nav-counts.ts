"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { getInvoices } from "@/lib/billing"
import { watchLeads } from "@/lib/leads"
import { getOrganizations } from "@/lib/organizations"
import { getProjects } from "@/lib/projects"
import { getUsers } from "@/lib/users"

/**
 * How many leads, contacts, clients, campaigns and invoices the agency has,
 * keyed by the sidebar link they belong to. Campaigns includes archived items.
 * Only for the agency's own staff; anyone else gets none.
 */
export function useNavCounts(): Record<string, number> {
  const { user, role } = useAuth()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const isStaff = role === "admin" || role === "superadmin"

  useEffect(() => {
    if (!user || !isStaff) {
      setCounts({})
      return
    }
    let active = true
    const set = (href: string, value: number) => { if (active) setCounts((current) => ({ ...current, [href]: value })) }

    getUsers()
      .then((rows) => set("/dashboard/users", rows.filter((row) => Boolean(row.displayName?.trim() || row.email?.trim())).length))
      .catch(() => {})
    // The Clients page folds companies with the same name into one row.
    getOrganizations()
      .then((rows) => set("/dashboard/clients", new Set(rows.map((row) => (row.name || row.id).trim().toLowerCase())).size))
      .catch(() => {})
    getInvoices()
      .then((rows) => set("/dashboard/invoices", rows.length))
      .catch(() => {})
    getProjects()
      .then((rows) => set("/dashboard/projects", rows.length))
      .catch(() => {})

    let stopLeads = () => {}
    getCurrentAgencyId()
      .then((agencyId) => {
        if (!active) return
        stopLeads = watchLeads(agencyId, (rows) => set("/dashboard/leads", rows.length), () => {})
      })
      .catch(() => {})

    return () => {
      active = false
      stopLeads()
    }
  }, [user, isStaff])

  return counts
}
