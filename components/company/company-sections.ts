import { Image as ImageIcon, Palette, Activity, BadgeDollarSign, Mail, Bot, Contact, CreditCard, FileText, Fingerprint, Globe, Info, Link2, ListTodo, Megaphone, Share2, Tag, TrendingUp, Users } from "lucide-react"

/** The sections of a company page, in menu order. Plain module so server routes can check a section too. */
export const COMPANY_SECTIONS = [
  { key: "projects", label: "Campaigns", icon: Megaphone },
  // Every campaign's creators, at company level.
  { key: "creators", label: "Creators", icon: Users },
  // Every campaign's posts, at company level.
  { key: "content", label: "Content", icon: Palette },
  { key: "social", label: "Social Media", icon: Share2 },
  // Marketing: the company gives its website and the outreach flow runs from there.
  { key: "marketing", label: "Marketing", icon: Megaphone },
  // What the Marketing run finds: companies and people, the emails to them, and the ads.
  { key: "keywords", label: "Keywords", icon: Tag },
  { key: "leads", label: "Leads", icon: Contact },
  { key: "outreach", label: "Outreach", icon: Mail },
  { key: "ads", label: "Ads", icon: BadgeDollarSign },
  { key: "documents", label: "Documents", icon: FileText },
  // Images and videos, under Marketing.
  { key: "assets", label: "Assets", icon: ImageIcon },
  { key: "ngai", label: "Help", icon: Bot },
  // The viewer's own Ngai builder chats (apps and websites), opened in the builder.
  { key: "domains", label: "Domains", icon: Link2 },
  // Home pages for the Websites, Finance and Security groups.
  { key: "websites-home", label: "Websites", icon: Globe },
  { key: "finance-home", label: "Finance", icon: CreditCard },
  { key: "security-home", label: "Security", icon: Fingerprint },
  { key: "sites", label: "Websites", icon: Globe },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "about", label: "About", icon: Info },
  { key: "team", label: "Team", icon: Users },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "analytics", label: "Analytics", icon: TrendingUp },
  { key: "billings", label: "Billing", icon: CreditCard },
  { key: "customers", label: "Customers", icon: Contact },
  { key: "visitors", label: "Security", icon: Fingerprint },
] as const

export type CompanySectionKey = (typeof COMPANY_SECTIONS)[number]["key"]

export function isCompanySection(value: string | null | undefined): value is CompanySectionKey {
  return COMPANY_SECTIONS.some((s) => s.key === value)
}
