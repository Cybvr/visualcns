"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ExternalLink, Mail, MoreVertical } from "lucide-react"

import { Ngai } from "@/components/agent/ngai"
import { Button } from "@/components/ui/button"

import {
  CompanyPageProvider,
  useCompanyPage,
  type CompanyPageData,
} from "@/components/company/company-page-context"
import { SectionNav } from "@/components/company/section-nav"
import { CompanySection } from "@/components/company/sections/company-section"
import { useClientOpen, useHideHeader, usePageHeaderActions, usePageHeaderBack, usePageHeaderTitle } from "@/components/dashboard/page-title-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { cn } from "@/lib/utils"

function usePhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)")
    const sync = () => setPhone(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])
  return phone
}

export type { CompanyPageAdmin, CompanyPageCompany, CompanyPagePerson } from "@/components/company/company-page-context"

function DashboardCompanyView({ embedded = false, onBack }: { embedded?: boolean; onBack?: () => void }) {
  const { company, people, admin, sections, section, sectionHref, projects, updateParams } = useCompanyPage()
  const searchParams = useSearchParams()

  // On phones an open campaign takes the whole pane: the client's tabs hide and the
  // header shows the campaign's name, with Back closing it. Otherwise the header
  // shows the company's name, with Back to the companies list.
  const phone = usePhone()
  const campaignId = section === "projects" ? searchParams.get("campaign") : null
  const campaignTitle = campaignId ? projects.find((project) => project.id === campaignId)?.title : undefined
  const campaignOpen = Boolean(campaignTitle)
  const latest = useRef({ updateParams, onBack })
  latest.current = { updateParams, onBack }
  const headerTitle = phone ? (campaignTitle ?? company.name) : null
  const headerBack = useMemo(() => {
    if (!phone) return null
    if (campaignOpen) return { label: "Back to campaigns", onClick: () => latest.current.updateParams({ campaign: null, view: null, task: null }) }
    return onBack ? { label: "Back to companies", onClick: () => latest.current.onBack?.() } : null
  }, [phone, campaignOpen, onBack])
  usePageHeaderTitle(useMemo(() => headerTitle ? <span className="block truncate">{headerTitle}</span> : null, [headerTitle]))
  usePageHeaderBack(headerBack)

  // The dashboard sidebar stays as it is; the company's sections are tabs above its content.
  const router = useRouter()
  const goBack = () => (latest.current.onBack ? latest.current.onBack() : router.push("/dashboard/companies"))
  // The agency gets Ngai beside the company, like an open document or invoice, so the dashboard header steps aside.
  const withNgai = !embedded && Boolean(admin)
  useHideHeader(withNgai)

  const primaryContact = people.find((person) => person.adminUser?.uid === company.primaryContactId)
    || people.find((person) => person.adminUser?.email)
  // `admin` is rebuilt on every render, so the header actions depend on its
  // share path instead. Depending on the object caused a render loop.
  const sharePath = admin?.sharePath
  const recipientEmail = primaryContact?.adminUser?.email
  const recipientName = primaryContact?.adminUser?.displayName || primaryContact?.name

  const headerActions = useMemo(() => {
    if (!sharePath) return null
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              title="More actions"
              className="flex size-10 items-center justify-center rounded-full bg-transparent text-current outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href={buildEmailComposeHref({
                companyId: company.id,
                companyName: company.name,
                recipientEmail,
                recipientName,
                ctaText: "Open your company page",
                ctaUrl: sharePath,
              })}>
                <Mail className="size-4" aria-hidden="true" />
                Email
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={sharePath} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                Open page
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }, [sharePath, company.id, company.name, recipientEmail, recipientName])

  usePageHeaderActions(headerActions)
  useClientOpen(Boolean(sharePath))

  const publicHref = `/${encodeURIComponent(company.slug || company.id)}`
  if (withNgai) {
    return (
      // Ngai first, the company beside it, filling the dashboard card; each side scrolls on its own.
      <main className="w-full lg:grid lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        <aside className="hidden min-h-0 overflow-hidden border-r border-border lg:flex lg:flex-col">
          <Ngai
            scope={{ kind: "company" }}
            layout="panel"
            className="bg-transparent"
            heading={<>
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={goBack} aria-label="Back to Companies"><ArrowLeft className="size-4" aria-hidden="true" /></Button>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{company.name}</span>
              <Link href={publicHref} target="_blank" rel="noreferrer" aria-label={`Open ${company.name}'s page`} title="Open company page" className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ExternalLink className="size-4" aria-hidden="true" /></Link>
            </>}
          />
        </aside>
        <section className="flex min-w-0 flex-col lg:min-h-0">
          {/* The company's tabs, edge to edge like an open document's toolbar. */}
          <div className={cn("sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 print:hidden lg:px-4", campaignOpen && "max-sm:hidden")}>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 max-md:hidden lg:hidden" onClick={goBack} aria-label="Back to Companies"><ArrowLeft className="size-4" aria-hidden="true" /></Button>
            <SectionNav sections={sections} active={section} href={sectionHref} phoneVisible={3} className="h-full min-w-0 flex-1 px-0 md:px-0" />
            {headerActions}
          </div>
          <div className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:overflow-y-auto">
            <CompanySection section={section} />
          </div>
        </section>
      </main>
    )
  }

  const inSidebar = false

  return (
    <main className={embedded ? "w-full min-w-0" : "mx-auto min-h-screen w-full max-w-7xl max-md:bg-page px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-16 sm:pt-8 md:pt-6"}>
      <div className={cn(!inSidebar && "md:grid md:grid-cols-[8rem_minmax(0,1fr)] md:items-start md:gap-6")}>
        <aside className={cn("hidden md:sticky md:top-6", !inSidebar && "md:block")}>
          <SectionNav sections={sections} active={section} href={sectionHref} vertical />
        </aside>
        <div className="min-w-0">
          {/* Keep the phone navigation horizontal; desktop uses the vertical rail. */}
          <div className={cn((campaignOpen || inSidebar) && "hidden", embedded
            ? "sticky top-0 z-30 border-b border-border bg-background print:hidden max-sm:-mx-4 md:hidden"
            : "sticky top-14 z-30 -mx-4 -mt-4 border-b border-border bg-background print:hidden sm:-mx-6 sm:-mt-6 md:hidden")}
          >
            <SectionNav sections={sections} active={section} href={sectionHref} phoneVisible={3} />
          </div>
          <CompanySection section={section} />
        </div>
      </div>

      {admin && !embedded && <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />}
    </main>
  )
}

/**
 * The company page inside the dashboard, with its sections as tabs (?tab=).
 * Supplying `admin` reveals private actions; omitting it keeps the page
 * read-only. The public page uses the same sections in CompanyProfileShell.
 */
export function CompanyPage({ embedded, onBack, ...props }: CompanyPageData & { embedded?: boolean; onBack?: () => void }) {
  return (
    <CompanyPageProvider mode="tabs" {...props}>
      <DashboardCompanyView embedded={embedded} onBack={onBack} />
    </CompanyPageProvider>
  )
}
