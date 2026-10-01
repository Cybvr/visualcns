"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut, User as UserIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanyProfileHeader } from "@/components/company/company-profile-header"
import { SectionNav, SectionRail } from "@/components/company/section-nav"
import { Button } from "@/components/ui/button"

function CompanyIdentity() {
  const { company } = useCompanyPage()
  return (
    <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start lg:px-2">
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white">
        {company.logoUrl ? (
          // Company logos can be hosted outside the configured image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={`${company.name} logo`} className="size-8 object-contain" />
        ) : (
          <span className="text-lg font-semibold text-muted-foreground">{company.name.trim().charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>
      <div className="hidden min-w-0 lg:block">
        <div data-weight="bold" className="truncate text-[19px] leading-tight tracking-[-0.02em] text-foreground">{company.name}</div>
        {company.slug && <div className="mt-0.5 truncate text-sm font-semibold text-foreground">@{company.slug}</div>}
      </div>
    </div>
  )
}

function SidebarAccount() {
  const { company } = useCompanyPage()
  const { user, appUser, signOut } = useAuth()
  const router = useRouter()

  if (!user) {
    if (!company.slug) return null
    return (
      <Button asChild size="icon-lg" className="lg:w-full lg:px-4">
        <Link href={`/${encodeURIComponent(company.slug)}/sign-in`} aria-label="Sign in">
          <LogIn className="size-5 lg:hidden" aria-hidden="true" />
          <span className="hidden lg:inline">Sign in</span>
        </Link>
      </Button>
    )
  }

  const name = appUser?.displayName || user.displayName
  const email = appUser?.email || user.email
  const photo = appUser?.photoURL || user.photoURL

  return (
    <div className="flex items-center gap-3 rounded-full lg:p-2">
      <div className="hidden size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted lg:grid">
        {photo ? (
          // Profile photos can be hosted outside the configured image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <UserIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="hidden min-w-0 flex-1 text-sm leading-tight lg:block">
        <div className="truncate font-semibold text-foreground">{name || email}</div>
        {appUser?.slug ? (
          <div className="truncate text-muted-foreground">@{appUser.slug}</div>
        ) : name && email ? (
          <div className="truncate text-muted-foreground">{email}</div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        onClick={() => { void signOut().then(() => router.replace("/login")) }}
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:size-9"
      >
        <LogOut className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * The public company page frame: a sidebar with the company, its sections and
 * the signed-in account, beside a content area for the current section page.
 * Phones get the banner header with tabs instead, since the sidebar won't fit.
 */
export function CompanyProfileShell({ children }: { children: ReactNode }) {
  const { company, people, sections, section, sectionHref } = useCompanyPage()
  const { user, signOut } = useAuth()
  const router = useRouter()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl md:gap-6 md:px-6 lg:gap-8">
      <aside className="sticky top-0 hidden h-svh w-[52px] shrink-0 flex-col border-r border-border px-1 py-6 print:hidden md:flex lg:w-[232px] lg:px-3">
        <CompanyIdentity />
        <SectionRail sections={sections} active={section} href={sectionHref} />
        <div className="mt-auto px-1 pt-4 lg:px-2">
          <SidebarAccount />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 max-md:bg-page sm:px-6 sm:pb-16 sm:pt-6 md:px-0">
        <CompanyProfileHeader
          mobileOnly
          name={company.name}
          handle={company.slug}
          description={company.description}
          categoryLabel={company.categoryLabel}
          logoUrl={company.logoUrl}
          coverUrl={company.media?.find((url) => url && url !== company.logoUrl)}
          location={company.location}
          website={company.website}
          linkedIn={company.linkedIn}
          contactCount={people.length}
          accountAction={user ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-[9px] px-3"
              onClick={() => { void signOut().then(() => router.replace("/login")) }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Button>
          ) : undefined}
          tabs={<SectionNav sections={sections} active={section} href={sectionHref} />}
        />
        {children}
      </main>
    </div>
  )
}
