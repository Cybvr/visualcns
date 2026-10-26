"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { getEstimates, getInvoices } from "@/lib/billing"
import { getCompanyDocuments } from "@/lib/company-documents"
import { watchLeads } from "@/lib/leads"
import { watchNotes } from "@/lib/notes"
import { getOrganizations } from "@/lib/organizations"
import { getProjects } from "@/lib/projects"
import { getUsers } from "@/lib/users"

/**
 * How many leads, contacts, clients, campaigns and Drive records the agency has,
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
    let driveCount = 0
    let noteCount = 0
    const updateDriveCount = () => set("/dashboard/drive", driveCount + noteCount)
    Promise.allSettled([getInvoices(), getEstimates(), getCompanyDocuments()])
      .then((results) => {
        driveCount = results.reduce((total, result) => total + (result.status === "fulfilled" ? result.value.length : 0), 0)
        updateDriveCount()
      })
    getProjects()
      .then((rows) => set("/dashboard/projects", rows.length))
      .catch(() => {})

    let stopLeads = () => {}
    let stopNotes = () => {}
    getCurrentAgencyId()
      .then((agencyId) => {
        if (!active) return
        stopLeads = watchLeads(agencyId, (rows) => set("/dashboard/leads", rows.length), () => {})
        stopNotes = watchNotes(agencyId, (rows) => { noteCount = rows.length; updateDriveCount() }, () => {})
      })
      .catch(() => {})

    return () => {
      active = false
      stopLeads()
      stopNotes()
    }
  }, [user, isStaff])

  return counts
}
