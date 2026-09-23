"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType } from "react"
import { ArrowLeft, Building2, ChevronRight, CreditCard, Database, LogOut, Palette, Server, Sparkles, UserRound, Users } from "lucide-react"

import { useAuth } from "@/components/auth-provider"

const LINKS: { label: string; href: string; icon: ComponentType<{ className?: string }>; adminOnly?: boolean; superAdminOnly?: boolean }[] = [
  { label: "Profile", href: "/dashboard/account/profile", icon: UserRound },
  { label: "Customization", href: "/dashboard/account/customization", icon: Palette },
  { label: "Organization", href: "/dashboard/account/business", icon: Building2, adminOnly: true },
  { label: "Team", href: "/dashboard/account/team", icon: Users, adminOnly: true },
  { label: "Agency", href: "/dashboard/account/agency", icon: Sparkles, adminOnly: true },
  { label: "Billing", href: "/dashboard/account/billing", icon: CreditCard, adminOnly: true },
  { label: "Data", href: "/dashboard/account/data", icon: Database, adminOnly: true },
  { label: "Tenant operations", href: "/dashboard/admin/tenants", icon: Server, superAdminOnly: true },
]

const MENU_HREF = "/dashboard/account"

/** The section title, shown under the back link. */
export function AccountHeader({ title }: { title: string }) {
  return (
    <header className="mt-7">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}

/** The settings menu itself: who you are, then every section as a stacked row. */
export function AccountMenu() {
  const { user, appUser, isAdmin, role, signOut } = useAuth()
  const links = LINKS
    .filter((link) => !link.adminOnly || isAdmin)
    .filter((link) => !link.superAdminOnly || role === "superadmin")
  const name = appUser?.displayName || user?.displayName || appUser?.email || user?.email || ""
  const photo = appUser?.photoURL || user?.photoURL || ""

  return (
    <div>
      <Link href="/dashboard/account/profile" className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-muted-foreground">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-foreground">{name}</span>
          {appUser?.slug && <span className="block truncate text-sm text-muted-foreground">@{appUser.slug}</span>}
        </span>
      </Link>

      <nav aria-label="Account settings" className="mt-6 flex flex-col text-sm">
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex h-12 items-center gap-3 border-b border-border text-foreground outline-none transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
        <button
          type="button"
          onClick={signOut}
          className="flex h-12 items-center gap-3 text-left text-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </button>
      </nav>
    </div>
  )
}

/** On a section page, a way back to the menu. The page itself slides in (see account layout). */
export function AccountNav() {
  const pathname = usePathname()
  if (pathname === MENU_HREF) return <AccountMenu />

  return (
    <Link
      href={MENU_HREF}
      className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Settings
    </Link>
  )
}
