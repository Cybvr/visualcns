"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, type ReactNode } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Bot, CalendarClock, Eye, FileText, House, LogOut, Megaphone, Receipt, UserRound } from "lucide-react"
import { FiBriefcase, FiMail, FiTrendingUp, FiUsers } from "react-icons/fi"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { AgentProvider } from "@/components/agent/agent-context"
import { Button } from "@/components/ui/button"
import { DashboardShell, type NavLink } from "@/components/dashboard-shell"
import { PageTitleProvider } from "@/components/dashboard/page-title-context"
import { LegacyClientRedirect } from "@/components/portal/legacy-client-redirect"
import { TaskSignInGate } from "@/components/dashboard/task-sign-in-gate"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"

const AgentDock = dynamic(() => import("@/components/agent/agent-dock").then((module) => module.AgentDock), { ssr: false })

const DASHBOARD_NAV: NavLink[] = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Email", href: "/dashboard/email", icon: FiMail },
  { label: "Leads", href: "/dashboard/leads", icon: FiTrendingUp, adminOnly: true },
  { label: "Schedules", href: "/dashboard/schedules", icon: CalendarClock },
  { label: "Contacts", href: "/dashboard/users", icon: FiUsers, adminOnly: true },
  { label: "Clients", href: "/dashboard/clients", icon: FiBriefcase, adminOnly: true },
  { label: "Campaigns", href: "/dashboard/projects", icon: Megaphone, adminOnly: true },
  // Estimates are a tab on Invoices, and Notes a tab on Documents.
  { label: "Invoices", href: "/dashboard/invoices", icon: Receipt, adminOnly: true, alsoActive: ["/dashboard/estimates"] },
  { label: "Documents", href: "/dashboard/documents", icon: FileText, adminOnly: true, alsoActive: ["/dashboard/notes"] },
  { label: "Support", href: "/dashboard/agent", icon: Bot },
]

/** Creators sign up by applying to a campaign: they see their campaigns and their account. */
const CREATOR_NAV: NavLink[] = [
  { label: "Campaigns", href: "/dashboard/projects", icon: Megaphone },
  { label: "Account", href: "/dashboard/account", icon: UserRound },
]

const CREATOR_PATHS = /^\/dashboard\/(?:projects$|account(?:\/|$))/

function UnifiedDashboardShell({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, role, isAdmin, isImpersonating, isViewingAs, impersonatedUser, stopViewingAs, loading, signOut, agencyStatus } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isTaskDetailRoute = /^\/dashboard\/tasks\/[^/]+$/.test(pathname ?? "")

  useEffect(() => {
    if (loading) return
    if (!user && !isTaskDetailRoute) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    else if (role === "creator" && !CREATOR_PATHS.test(pathname ?? "")) router.replace("/dashboard/projects")
    else if (requireAdmin && !isAdmin) router.replace("/dashboard")
  }, [loading, user, isAdmin, role, pathname, requireAdmin, router, isTaskDetailRoute])

  if (loading) {
    return <div className="min-h-screen bg-background p-6"><DashboardPageSkeleton variant="home" rows={4} /></div>
  }

  if (!user) return isTaskDetailRoute ? <TaskSignInGate /> : <div className="min-h-screen bg-background p-6"><DashboardPageSkeleton variant="home" rows={4} /></div>

  if (requireAdmin && !isAdmin) return null

  if (agencyStatus === "suspended" && role !== "superadmin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Image src="/visualhqlogo.svg" alt="VisualHQ" width={36} height={36} />
        <div><h1 className="text-lg font-semibold">Agency suspended</h1><p className="mt-1 max-w-sm text-sm text-muted-foreground">This agency is currently unavailable. Contact support to restore access.</p></div>
        <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      </div>
    )
  }

  if (role === "client" || isImpersonating) return <Suspense><LegacyClientRedirect /></Suspense>

  if (role === "creator") {
    if (!CREATOR_PATHS.test(pathname ?? "")) return null
    return (
      <AgentProvider>
        <PageTitleProvider>
          <DashboardShell title="VisualCNS" navLinks={CREATOR_NAV} rootHref="/dashboard/projects">{children}</DashboardShell>
        </PageTitleProvider>
      </AgentProvider>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Image src="/visualhqlogo.svg" alt="VisualHQ" width={36} height={36} />
        <div>
          <h1 className="text-lg font-semibold">No dashboard for this account</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{user.email} isn&apos;t assigned to an agency yet.</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      </div>
    )
  }

  return (
    <AgentProvider>
      <DashboardWithAgent
        navLinks={DASHBOARD_NAV
          .filter((link) => !link.adminOnly || isAdmin)
          .filter((link) => !link.superAdminOnly || role === "superadmin")
          .map((link) => ({
            ...link,
            items: link.items?.filter((item) => !item.adminOnly || isAdmin),
          }))}
        banner={isViewingAs ? (
          <div className="flex h-10 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-200 sm:px-6">
            <span className="flex min-w-0 items-center gap-2">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">Viewing as <strong>{impersonatedUser?.displayName || impersonatedUser?.email}</strong></span>
            </span>
            <Button size="sm" variant="outline" className="h-7 shrink-0 border-amber-300 bg-white text-amber-900 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-200" onClick={() => { stopViewingAs(); router.push("/dashboard/users") }}>Exit view</Button>
          </div>
        ) : undefined}
      >
        {children}
      </DashboardWithAgent>
    </AgentProvider>
  )
}

/**
 * Keeps the agent in a floating widget on desktop (a full-screen sheet handles
 * mobile), opened from the dashboard header.
 */
function DashboardWithAgent({
  navLinks,
  banner,
  children,
}: {
  navLinks: NavLink[]
  banner?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <PageTitleProvider>
        <DashboardShell title="VisualCNS" navLinks={navLinks} rootHref="/dashboard" banner={banner}>
          {children}
        </DashboardShell>
      </PageTitleProvider>

      <AgentDock />

    </>
  )
}

export function UnifiedDashboardLayout({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  return <AuthProvider><UnifiedDashboardShell requireAdmin={requireAdmin}>{children}</UnifiedDashboardShell></AuthProvider>
}
