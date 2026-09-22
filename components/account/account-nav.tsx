"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

const LINKS = [
  { label: "Account", href: "/dashboard/account" },
  { label: "Profile", href: "/dashboard/account/profile" },
  { label: "Customization", href: "/dashboard/account/customization" },
  { label: "Organization profile", href: "/dashboard/account/business", adminOnly: true },
  { label: "Agency", href: "/dashboard/account/agency", adminOnly: true },
  { label: "Billing", href: "/dashboard/account/billing", adminOnly: true },
  { label: "Data", href: "/dashboard/account/data", adminOnly: true },
  { label: "Tenant operations", href: "/dashboard/admin/tenants", superAdminOnly: true },
]

/** The tab's title and one-line description, shown inside the page under the nav. */
export function AccountHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mt-7">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  )
}

export function AccountNav() {
  const pathname = usePathname()
  const { isAdmin, role } = useAuth()
  const links = LINKS
    .filter((link) => !link.adminOnly || isAdmin)
    .filter((link) => !link.superAdminOnly || role === "superadmin")

  return (
    <div className="-mx-4 flex gap-6 overflow-x-auto border-b border-border px-4 scrollbar-none sm:mx-0 sm:px-0" role="tablist" aria-label="Account settings">
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            ref={active ? (node) => node?.scrollIntoView({ block: "nearest", inline: "center" }) : undefined}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative flex h-11 shrink-0 items-center whitespace-nowrap text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active && "text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-foreground",
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
