const DASHBOARD_SECTION_TITLES: Record<string, string> = {
  account: "Account",
  admin: "Admin",
  agent: "Agent",
  calendar: "Calendar",
  chats: "All Chats",
  clients: "Clients",
  companies: "Clients",
  contracts: "Contracts",
  documents: "Documents",
  drive: "Drive",
  email: "Email",
  estimates: "Estimates",
  invoices: "Invoices",
  leads: "Leads",
  media: "Media",
  notes: "Notes",
  overview: "Overview",
  projects: "Projects",
  seo: "SEO",
  settings: "Settings",
  tasks: "Tasks",
  users: "Contacts",
  visitors: "Visitors",
}

const COMPANY_SECTION_TITLES: Record<string, string> = {
  about: "Home",
  activity: "Notifications",
  "brand-health": "Pulse",
  documents: "Drive",
  drive: "Drive",
  finance: "Finance",
  media: "Drive",
  messages: "Messages",
  notifications: "Notifications",
  projects: "Jobs",
  pulse: "Pulse",
  tasks: "Tasks",
  team: "Team",
  visitors: "Pass",
}

type SearchParamsReader = Pick<URLSearchParams, "get">

export function readableUrlPart(value: string, fallback = "Page") {
  let decoded = value
  try { decoded = decodeURIComponent(value) } catch { /* Keep the encoded value as a safe fallback. */ }
  const readable = decoded
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  return readable || fallback
}

export function companySectionTitle(section: string | null | undefined, fallback = "Home") {
  return section ? COMPANY_SECTION_TITLES[section.toLowerCase()] || readableUrlPart(section, fallback) : fallback
}

function recordSection(plural: string, singular: string, record?: string, action?: string) {
  if (!record) return plural
  if (record === "new") return `New ${singular}`
  return action === "edit" ? `Edit ${singular}` : singular
}

export function dashboardClientRef(pathname: string, searchParams?: SearchParamsReader) {
  const segments = pathname.split("/").filter(Boolean)
  return ["clients", "companies"].includes(segments[1] || "")
    ? segments[2] || searchParams?.get("client") || ""
    : ""
}

export function dashboardPageTitle(pathname: string, searchParams?: SearchParamsReader) {
  const segments = pathname.split("/").filter(Boolean)
  const section = segments[1]
  const record = segments[2]
  const action = segments[3]

  if (!section) return "Home"

  if (section === "account") {
    const accountTitles: Record<string, string> = {
      agency: "Agency",
      business: "Agency Settings",
      customization: "App Settings",
      data: "Data",
      integrations: "Integrations",
      knowledge: "Knowledge",
      notifications: "Notifications",
      profile: "Profile",
      team: "Team",
    }
    return record ? accountTitles[record] || readableUrlPart(record) : "Account"
  }
  if (section === "admin") return record === "agencies" ? "Agency Management" : "Admin"
  if (section === "settings") return record === "business" ? "Organization Profile" : "Settings"
  if (section === "clients" || section === "companies") {
    const clientRef = record || searchParams?.get("client")
    if (!clientRef) return "Clients"
    if (action === "edit") return "Edit Client"
    return companySectionTitle(searchParams?.get("tab"), "Jobs")
  }
  if (section === "contracts") return recordSection("Contracts", "Contract", record, action)
  if (section === "documents") return recordSection("Documents", "Document", record, action)
  if (section === "estimates") return recordSection("Estimates", "Estimate", record, action)
  if (section === "invoices") return recordSection("Invoices", "Invoice", record, action)
  if (section === "projects") return record ? "Project" : "Projects"
  if (section === "tasks") return record ? "Task" : "Tasks"
  return DASHBOARD_SECTION_TITLES[section] || "Dashboard"
}
