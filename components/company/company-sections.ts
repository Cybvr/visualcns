import { Activity, Bot, ChartColumn, CreditCard, FileText, Fingerprint, Globe, Info, Link2, ListTodo, Megaphone, Share2, TrendingUp, Users } from "lucide-react"

/** The sections of a company page, in menu order. Plain module so server routes can check a section too. */
export const COMPANY_SECTIONS = [
  { key: "projects", label: "Campaigns", icon: Megaphone },
  { key: "social", label: "Social Media", icon: Share2 },
  { key: "documents", label: "Drive", icon: FileText },
  { key: "ngai", label: "Help", icon: Bot },
  // The viewer's own Ngai builder chats (apps and websites), opened in the builder.
  { key: "domains", label: "Domains", icon: Link2 },
  { key: "sites", label: "Websites", icon: Globe },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "about", label: "About", icon: Info },
  { key: "team", label: "Team", icon: Users },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "pulse", label: "Reports", icon: ChartColumn },
  { key: "analytics", label: "Analytics", icon: TrendingUp },
  { key: "billings", label: "Billing", icon: CreditCard },
  { key: "visitors", label: "Security", icon: Fingerprint },
] as const

export type CompanySectionKey = (typeof COMPANY_SECTIONS)[number]["key"]

export function isCompanySection(value: string | null | undefined): value is CompanySectionKey {
  return COMPANY_SECTIONS.some((s) => s.key === value)
}
