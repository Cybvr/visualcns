"use client"

import dynamic from "next/dynamic"
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, CalendarClock, Eye, FolderOpen, House, LogOut, Megaphone, UserRound } from "lucide-react"
import { FiBriefcase, FiMail, FiTrendingUp, FiUsers } from "react-icons/fi"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { AgentProvider } from "@/components/agent/agent-context"
import { NgaiMark } from "@/components/agent/ngai-mark"
import { Button } from "@/components/ui/button"
import { DashboardShell, type NavLink } from "@/components/dashboard-shell"
import { PageTitleProvider } from "@/components/dashboard/page-title-context"
import { LegacyClientRedirect } from "@/components/portal/legacy-client-redirect"
import { TaskSignInGate } from "@/components/dashboard/task-sign-in-gate"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { AppEntryLoader } from "@/components/app-entry-loader"
import { DashboardEntryReadyContext } from "@/components/dashboard/dashboard-entry-context"
import { setPageCacheScope } from "@/lib/page-cache"

const AgentDock = dynamic(() => import("@/components/agent/agent-dock").then((module) => module.AgentDock), { ssr: false })

const DASHBOARD_NAV: NavLink[] = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Chat", href: "/dashboard/chat", icon: NgaiMark },
  { label: "Email", href: "/dashboard/email/inbox", icon: FiMail, alsoActive: ["/dashboard/email"] },
  { label: "Leads", href: "/dashboard/leads", icon: FiTrendingUp, adminOnly: true },
  { label: "Schedules", href: "/dashboard/schedules", icon: CalendarClock },
  { label: "Contacts", href: "/dashboard/users", icon: FiUsers, adminOnly: true },
  { label: "Companies", href: "/dashboard/companies", icon: FiBriefcase, adminOnly: true },
  { label: "Campaigns", href: "/dashboard/projects", icon: Megaphone, adminOnly: true },
  { label: "Drive", href: "/dashboard/drive", icon: FolderOpen, adminOnly: true, alsoActive: ["/dashboard/invoices", "/dashboard/estimates", "/dashboard/documents", "/dashboard/notes"] },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, adminOnly: true },
]

/** Creators sign up by applying to a campaign: they see their campaigns and their account. */
const CREATOR_NAV: NavLink[] = [
  { label: "Campaigns", href: "/dashboard/projects", icon: Megaphone },
  { label: "Account", href: "/dashboard/account", icon: UserRound },
]

const CREATOR_PATHS = /^\/dashboard\/(?:projects$|account(?:\/|$))/

function UnifiedDashboardShell({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, appUser, role, isAdmin, isImpersonating, isViewingAs, impersonatedUser, stopViewingAs, loading, signOut, agencyStatus } = useAuth()
  const router = useRouter()
  const [hasEntered, setHasEntered] = useState(false)
  const [homeReady, setHomeReady] = useState(false)
  const [entryComplete, setEntryComplete] = useState(false)
  const markHomeReady = useCallback(() => setHomeReady(true), [])
  // Before any page reads its remembered data: a different account, view-as or agency starts clean.
  if (!loading) setPageCacheScope([user?.uid, impersonatedUser?.uid, appUser?.agencyId, role].join(":"))
  const pathname = usePathname()
  const isTaskDetailRoute = /^\/dashboard\/tasks\/[^/]+$/.test(pathname ?? "")
  const openingHome = !loading && Boolean(user) && isAdmin && !isImpersonating && pathname === "/dashboard"

  useEffect(() => {
    if (loading || hasEntered) return
    if (!openingHome) {
      setHasEntered(true)
      return
    }
    if (!homeReady) return
    setEntryComplete(true)
    const timeout = window.setTimeout(() => setHasEntered(true), 350)
    return () => window.clearTimeout(timeout)
  }, [loading, hasEntered, openingHome, homeReady])

  useEffect(() => {
    if (!openingHome || hasEntered || homeReady) return
    // If a data source stalls, reveal the page and its existing loading/error state.
    const timeout = window.setTimeout(() => setHasEntered(true), 10000)
    return () => window.clearTimeout(timeout)
  }, [openingHome, hasEntered, homeReady])

  useEffect(() => {
    if (loading) return
    if (!user && !isTaskDetailRoute) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    else if (role === "creator" && !CREATOR_PATHS.test(pathname ?? "")) router.replace("/dashboard/projects")
    else if (requireAdmin && !isAdmin) router.replace("/dashboard")
  }, [loading, user, isAdmin, role, pathname, requireAdmin, router, isTaskDetailRoute])

  if (loading) {
    return hasEntered
      ? <div className="min-h-screen bg-background p-6"><DashboardPageSkeleton variant="home" rows={4} /></div>
      : <AppEntryLoader phase="auth" message="Signing you in" />
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

  const showEntryLoader = openingHome && !hasEntered

  return (
    <DashboardEntryReadyContext.Provider value={markHomeReady}>
      <div className={showEntryLoader ? "invisible pointer-events-none" : undefined} aria-hidden={showEntryLoader}>
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
      </div>
      {showEntryLoader && <AppEntryLoader phase={entryComplete ? "complete" : "workspace"} message={entryComplete ? "Dashboard ready" : "Loading your dashboard"} />}
    </DashboardEntryReadyContext.Provider>
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
