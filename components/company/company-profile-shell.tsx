"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut, Menu, User as UserIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiWidget } from "@/components/company/ngai-widget"
import { SectionRail } from "@/components/company/section-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/** `expanded` shows the name and handle at every width, for the phone drawer. */
function CompanyIdentity({ expanded = false }: { expanded?: boolean }) {
  const { company } = useCompanyPage()
  return (
    <div className={cn("mb-4 flex items-center gap-3", expanded ? "px-2" : "justify-center lg:justify-start lg:px-2")}>
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white">
        {company.logoUrl ? (
          // Company logos can be hosted outside the configured image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={`${company.name} logo`} className="size-8 object-contain" />
        ) : (
          <span className="text-lg font-semibold text-muted-foreground">{company.name.trim().charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>
      <div className={cn("min-w-0", !expanded && "hidden lg:block")}>
        <div data-weight="bold" className="truncate text-[19px] leading-tight tracking-[-0.02em] text-foreground">{company.name}</div>
        {company.slug && <div className="mt-0.5 truncate text-sm font-semibold text-foreground">@{company.slug}</div>}
      </div>
    </div>
  )
}

function SidebarAccount({ expanded = false }: { expanded?: boolean }) {
  const { company } = useCompanyPage()
  const { user, appUser, signOut } = useAuth()
  const router = useRouter()

  if (!user) {
    if (!company.slug) return null
    return (
      <Button asChild size="icon-lg" className={expanded ? "w-full px-4" : "lg:w-full lg:px-4"}>
        <Link href={`/${encodeURIComponent(company.slug)}/sign-in`} aria-label="Sign in">
          <LogIn className={cn("size-5", expanded ? "hidden" : "lg:hidden")} aria-hidden="true" />
          <span className={expanded ? undefined : "hidden lg:inline"}>Sign in</span>
        </Link>
      </Button>
    )
  }

  const name = appUser?.displayName || user.displayName
  const email = appUser?.email || user.email
  const photo = appUser?.photoURL || user.photoURL

  return (
    <div className={cn("flex items-center gap-3 rounded-full", expanded ? "p-2" : "lg:p-2")}>
      <div className={cn("size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted", expanded ? "grid" : "hidden lg:grid")}>
        {photo ? (
          // Profile photos can be hosted outside the configured image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <UserIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className={cn("min-w-0 flex-1 text-sm leading-tight", !expanded && "hidden lg:block")}>
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

/** The sidebar's contents, shared by the fixed sidebar and the phone drawer. */
function SidebarBody({ expanded = false, onNavigate }: { expanded?: boolean; onNavigate?: () => void }) {
  const { sections, section, sectionHref } = useCompanyPage()
  return (
    <>
      <CompanyIdentity expanded={expanded} />
      <SectionRail sections={sections} active={section} href={sectionHref} expanded={expanded} onNavigate={onNavigate} />
      <div className={cn("mt-auto pt-4", expanded ? "" : "px-1 lg:px-2")}>
        <SidebarAccount expanded={expanded} />
      </div>
    </>
  )
}

/**
 * The public company page frame: a sidebar with the company, its sections and
 * the signed-in account, beside a content area for the current section page.
 * Phones get a top bar instead, and its menu button opens the sidebar as a drawer.
 */
export function CompanyProfileShell({ children }: { children: ReactNode }) {
  const { company, sections, section } = useCompanyPage()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sectionLabel = sections.find((item) => item.key === section)?.label

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1600px] md:gap-6 md:px-6 lg:gap-8">
      <aside className="sticky top-0 hidden h-svh w-[52px] shrink-0 flex-col border-r border-border px-1 py-6 print:hidden md:flex lg:w-[232px] lg:px-3">
        <SidebarBody />
      </aside>

      <div className="min-w-0 flex-1 md:border-r md:border-border">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-2 backdrop-blur print:hidden md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid size-10 shrink-0 place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 leading-tight">
            <div data-weight="bold" className="truncate text-[16px] text-foreground">{company.name}</div>
            {sectionLabel && <div className="truncate text-xs text-muted-foreground">{sectionLabel}</div>}
          </div>
        </header>

        <main className="min-w-0 px-4 pb-16 pt-4 sm:px-6 sm:pt-6 md:pl-0 md:pr-5 lg:pr-8">
          {children}
        </main>
      </div>

      <NgaiWidget />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="flex w-[280px] flex-col p-4 pt-6 md:hidden">
          <SheetTitle className="sr-only">{company.name} menu</SheetTitle>
          <SheetDescription className="sr-only">Sections of the company page and your account.</SheetDescription>
          <SidebarBody expanded onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
