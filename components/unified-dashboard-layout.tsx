"use client"

import { Suspense, useEffect, type ReactNode } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Bot, Briefcase, Building2, Eye, FileType2, LayoutDashboard, ListTodo, Loader2, LogOut, Mail, Megaphone, TrendingUp, Users } from "lucide-react"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { AgentDock } from "@/components/agent/agent-dock"
import { AgentProvider } from "@/components/agent/agent-context"
import { Button } from "@/components/ui/button"
import { DashboardShell, type NavLink } from "@/components/dashboard-shell"
import { PageTitleProvider } from "@/components/dashboard/page-title-context"
import { LegacyClientRedirect } from "@/components/portal/legacy-client-redirect"

const DASHBOARD_NAV: NavLink[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/dashboard/companies", icon: Building2, adminOnly: true },
  { label: "Contacts", href: "/dashboard/users", icon: Users, adminOnly: true },
  { label: "Email", href: "/dashboard/email", icon: Mail },
  { label: "Ngai", href: "/dashboard/agent", icon: Bot, opensAgent: true },
  { label: "Documents", href: "/dashboard/documents", icon: FileType2 },
  {
    label: "Operations",
    href: "/dashboard/projects",
    icon: Briefcase,
    items: [
      { label: "Projects", href: "/dashboard/projects", icon: Briefcase },
      { label: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
    ],
  },
  { label: "Marketing", href: "/dashboard/seo", icon: Megaphone, items: [{ label: "SEO", href: "/dashboard/seo", icon: TrendingUp }] },
]

function UnifiedDashboardShell({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, appUser, role, isAdmin, isImpersonating, impersonatedUser, stopViewingAs, loading, signOut, tenantStatus } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    else if (requireAdmin && !isAdmin) router.replace("/dashboard")
  }, [loading, user, isAdmin, requireAdmin, router])

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  if (requireAdmin && !isAdmin) return null

  if (tenantStatus === "suspended" && role !== "superadmin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Image src="/visualhqlogo.svg" alt="VisualHQ" width={36} height={36} />
        <div><h1 className="text-lg font-semibold">Workspace suspended</h1><p className="mt-1 max-w-sm text-sm text-muted-foreground">This workspace is currently unavailable. Contact support to restore access.</p></div>
        <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      </div>
    )
  }

  if (role === "client" || isImpersonating) return <Suspense><LegacyClientRedirect /></Suspense>

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <Image src="/visualhqlogo.svg" alt="VisualHQ" width={36} height={36} />
        <div>
          <h1 className="text-lg font-semibold">No dashboard for this account</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{user.email} isn&apos;t set up with a workspace yet.</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      </div>
    )
  }

  return (
    <AgentProvider>
      <DashboardWithAgent
        subtitle={appUser?.company || undefined}
        navLinks={DASHBOARD_NAV
          .filter((link) => !link.adminOnly || isAdmin)
          .filter((link) => !link.superAdminOnly || role === "superadmin")
          .map((link) => ({
            ...link,
            items: link.items?.filter((item) => !item.adminOnly || isAdmin),
          }))}
        banner={isImpersonating ? (
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
  subtitle,
  navLinks,
  banner,
  children,
}: {
  subtitle?: string
  navLinks: NavLink[]
  banner?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <PageTitleProvider>
        <DashboardShell title="VisualCNS" subtitle={subtitle} navLinks={navLinks} rootHref="/dashboard" banner={banner}>
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
