"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { usePageHeaderOverride } from "@/components/dashboard/page-title-context"

const APP_NAME = "VisualCNS"

function documentTitle(page: string, record?: string | null): string {
  return record && record !== page ? `${record} · ${page} | ${APP_NAME}` : `${page} | ${APP_NAME}`
}

/** "Invoices", "New Invoice", "Edit Invoice" or "Invoice" for a record section. */
function recordSection(plural: string, singular: string, record?: string, action?: string): string {
  if (!record) return plural
  if (record === "new") return `New ${singular}`
  return action === "edit" ? `Edit ${singular}` : singular
}

export function dashboardPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  const section = segments[1]
  const record = segments[2]
  const action = segments[3]

  if (!section) return "Home"

  switch (section) {
    case "account":
      if (record === "profile") return "Profile"
      if (record === "customization") return "App Settings"
      if (record === "notifications") return "Notifications"
      if (record === "business") return "Agency Settings"
      if (record === "agency") return "Agency"
      if (record === "billing") return "Billing"
      if (record === "data") return "Data"
      if (record === "integrations") return "Integrations"
      if (record === "team") return "Team"
      return "Account"
    case "admin":
      return record === "agencies" ? "Agencies" : "Admin"
    case "agent":
      return "Agent"
    case "chats":
      return "All Chats"
    case "calendar":
      return "Calendar"
    case "overview":
      return "Overview"
    case "companies":
    case "clients":
      if (!record) return "Clients"
      return action === "edit" ? "Edit Client" : "Client"
    case "contracts":
      return recordSection("Contracts", "Contract", record, action)
    case "documents":
      return recordSection("Documents", "Document", record, action)
    case "drive":
      return "Drive"
    case "email":
      return "Email"
    case "estimates":
      return recordSection("Estimates", "Estimate", record, action)
    case "invoices":
      return recordSection("Invoices", "Invoice", record, action)
    case "media":
      return "Media"
    case "notes":
      return "Notes"
    case "projects":
      return record ? "Project" : "Projects"
    case "seo":
      return "SEO"
    case "settings":
      return record === "business" ? "Organization Profile" : "Settings"
    case "tasks":
      return record ? "Task" : "Tasks"
    case "users":
      return "Contacts"
    case "visitors":
      return "Visitors"
    default:
      // The remaining dynamic /dashboard/[slug] route redirects to the
      // dashboard home, so it should never inherit a marketing-page title.
      return "Dashboard"
  }
}

export function DashboardDocumentTitle() {
  const pathname = usePathname()
  const { override, recordTitle } = usePageHeaderOverride()

  useEffect(() => {
    document.title = documentTitle(override?.title ?? dashboardPageTitle(pathname ?? "/dashboard"), recordTitle)
  }, [override?.title, pathname, recordTitle])

  return null
}
