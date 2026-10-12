import { Activity, ChartColumn, DollarSign, HardDrive, Info, ListTodo, Megaphone, MessageSquare, ScanLine, StickyNote, TrendingUp, Users } from "lucide-react"

/** The sections of a company page, in menu order. Plain module so server routes can check a section too. */
export const COMPANY_SECTIONS = [
  { key: "projects", label: "Campaigns", icon: Megaphone },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "about", label: "About", icon: Info },
  { key: "team", label: "Team", icon: Users },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "pulse", label: "Reports", icon: ChartColumn },
  { key: "analytics", label: "Analytics", icon: TrendingUp },
  { key: "drive", label: "Drive", icon: HardDrive },
  { key: "finance", label: "Payments", icon: DollarSign },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "visitors", label: "Pass", icon: ScanLine },
] as const

export type CompanySectionKey = (typeof COMPANY_SECTIONS)[number]["key"]

export function isCompanySection(value: string | null | undefined): value is CompanySectionKey {
  return COMPANY_SECTIONS.some((s) => s.key === value)
}
