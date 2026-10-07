import { Activity, Briefcase, Eye, HardDrive, HeartPulse, Info, ListTodo, Users } from "lucide-react"

/** The sections of a company page, in menu order. Plain module so server routes can check a section too. */
export const COMPANY_SECTIONS = [
  { key: "projects", label: "Projects", icon: Briefcase },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "about", label: "About", icon: Info },
  { key: "team", label: "Team", icon: Users },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "pulse", label: "Pulse", icon: HeartPulse },
  { key: "drive", label: "Drive", icon: HardDrive },
  { key: "visitors", label: "Pass", icon: Eye },
] as const

export type CompanySectionKey = (typeof COMPANY_SECTIONS)[number]["key"]

export function isCompanySection(value: string | null | undefined): value is CompanySectionKey {
  return COMPANY_SECTIONS.some((s) => s.key === value)
}
