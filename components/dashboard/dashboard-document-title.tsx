"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { usePageHeaderOverride } from "@/components/dashboard/page-title-context"

const APP_NAME = "VisualCNS"

function documentTitle(page: string): string {
  return `${page} | ${APP_NAME}`
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
      if (record === "customization") return "Customization"
      if (record === "business") return "Organization profile"
      return "Account"
    case "agent":
      return "Ngai"
    case "companies":
      if (!record) return "Companies"
      return action === "edit" ? "Edit Company" : "Company"
    case "contracts":
      if (!record) return "Contracts"
      if (record === "new") return "New Contract"
      return action === "edit" ? "Edit Contract" : "Contract"
    case "drive":
      return "Drive"
    case "email":
      return "Email"
    case "estimates":
      if (!record) return "Estimates"
      if (record === "new") return "New Estimate"
      return action === "edit" ? "Edit Estimate" : "Estimate"
    case "invoices":
      if (!record) return "Invoices"
      if (record === "new") return "New Invoice"
      return action === "edit" ? "Edit Invoice" : "Invoice"
    case "projects":
      return record ? "Project" : "Projects"
    case "seo":
      return "SEO"
    case "settings":
      return record === "business" ? "Organization Profile" : "Settings"
    case "tasks":
      return "Tasks"
    case "users":
      return "Contacts"
    default:
      // The remaining dynamic /dashboard/[slug] route redirects to the
      // dashboard home, so it should never inherit a marketing-page title.
      return "Dashboard"
  }
}

export function DashboardDocumentTitle() {
  const pathname = usePathname()
  const { override } = usePageHeaderOverride()

  useEffect(() => {
    document.title = documentTitle(override?.title ?? dashboardPageTitle(pathname ?? "/dashboard"))
  }, [override?.title, pathname])

  return null
}
