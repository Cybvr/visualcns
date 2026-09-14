"use client"

import { useCallback, useEffect, useState } from "react"

import { getContracts, getEstimates, getInvoices } from "@/lib/billing"
import { getCompanyDocuments } from "@/lib/company-documents"
import { getOrganizations, organizationRef } from "@/lib/organizations"
import { getProjects, projectSlug } from "@/lib/projects"
import { getTasks } from "@/lib/tasks"
import { getUsers } from "@/lib/users"
import {
  GlobalSearchDialog,
  SearchTrigger,
  stripHtml,
  useSearchHotkey,
  type SearchResult,
} from "@/components/search/global-search"

const join = (...parts: Array<string | undefined | null>) => parts.filter(Boolean).join(" · ")
const keywords = (...parts: Array<string | undefined | null>) => parts.filter(Boolean).join(" ")

/**
 * Dashboard-wide content search. The admin surface is tenant-scoped by every
 * loader, so a signed-in admin searches their whole workspace. Data is fetched
 * once, the first time the palette is opened.
 */
export function SidebarSearch() {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const openSearch = useCallback(() => setOpen(true), [])
  useSearchHotkey(openSearch)

  useEffect(() => {
    if (!open || loaded) return
    let active = true
    setLoading(true)

    Promise.all([
      getOrganizations().catch(() => []),
      getUsers().catch(() => []),
      getProjects().catch(() => []),
      getTasks().catch(() => []),
      getCompanyDocuments().catch(() => []),
      getInvoices().catch(() => []),
      getEstimates().catch(() => []),
      getContracts().catch(() => []),
    ])
      .then(([orgs, users, projects, tasks, documents, invoices, estimates, contracts]) => {
        if (!active) return
        const next: SearchResult[] = [
          ...orgs.map((org) => ({
            id: `company-${org.id}`,
            group: "Companies",
            label: org.name,
            sublabel: join(org.industry, org.location) || undefined,
            href: `/dashboard/companies/${organizationRef(org)}`,
            keywords: keywords(org.industry, org.location, org.website, org.email, (org.tags || []).join(" "), org.slug),
          })),
          ...users.map((user) => ({
            id: `contact-${user.uid}`,
            group: "Contacts",
            label: user.displayName || user.email,
            sublabel: join(user.company, user.email) || undefined,
            href: "/dashboard/users",
            keywords: keywords(user.email, user.role, user.company),
          })),
          ...projects.map((project) => ({
            id: `project-${project.id}`,
            group: "Projects",
            label: project.title,
            sublabel: join(project.client, project.service) || undefined,
            href: `/dashboard/projects/${projectSlug(project)}`,
            keywords: keywords(project.client, project.service, project.summary, (project.category || []).join(" ")),
          })),
          ...tasks.map((task) => ({
            id: `task-${task.id}`,
            group: "Tasks",
            label: task.name,
            sublabel: join(task.project, task.client) || undefined,
            href: "/dashboard/tasks",
            keywords: keywords(task.project, task.client, stripHtml(task.content || "")),
          })),
          ...documents.map((doc) => ({
            id: `document-${doc.id}`,
            group: "Documents",
            label: doc.title,
            sublabel: join(doc.kind, doc.client) || undefined,
            href: `/dashboard/documents/${doc.id}`,
            keywords: keywords(doc.client, doc.project, doc.summary, stripHtml(doc.body || "")),
          })),
          ...invoices.map((invoice) => ({
            id: `invoice-${invoice.id}`,
            group: "Invoices",
            label: invoice.invoiceNumber || "Invoice",
            sublabel: join(invoice.client, invoice.project) || undefined,
            href: `/dashboard/invoices/${invoice.id}`,
            keywords: keywords(invoice.client, invoice.project, invoice.poReference),
          })),
          ...estimates.map((estimate) => ({
            id: `estimate-${estimate.id}`,
            group: "Estimates",
            label: estimate.title || estimate.estimateNumber || "Estimate",
            sublabel: join(estimate.client, estimate.project) || undefined,
            href: `/dashboard/estimates/${estimate.id}`,
            keywords: keywords(estimate.estimateNumber, estimate.client, estimate.project),
          })),
          ...contracts.map((contract) => ({
            id: `contract-${contract.id}`,
            group: "Contracts",
            label: contract.title || "Contract",
            sublabel: join(contract.client, contract.project) || undefined,
            href: `/dashboard/contracts/${contract.id}`,
            keywords: keywords(contract.client, contract.project),
          })),
        ]
        setResults(next)
        setLoaded(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, loaded])

  return (
    <>
      <SearchTrigger onOpen={openSearch} />
      <GlobalSearchDialog
        open={open}
        onOpenChange={setOpen}
        results={results}
        loading={loading && !loaded}
        placeholder="Search companies, projects, documents…"
      />
    </>
  )
}
