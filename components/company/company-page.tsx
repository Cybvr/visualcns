"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Eye, ExternalLink, Mail, MoreVertical } from "lucide-react"

import {
  CompanyPageProvider,
  useCompanyPage,
  type CompanyPageData,
} from "@/components/company/company-page-context"
import { HeaderTeam } from "@/components/company/header-team"
import { SectionNav } from "@/components/company/section-nav"
import { useSidebarTakeover } from "@/components/company/sidebar-takeover"
import { CompanySection } from "@/components/company/sections/company-section"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { useClientOpen, usePageHeaderActions, usePageHeaderBack, usePageHeaderTitle } from "@/components/dashboard/page-title-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
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
  const { company, people, admin, sections, section, sectionHref, absoluteUrl, projects, updateParams } = useCompanyPage()
  const searchParams = useSearchParams()

  // On phones an open campaign takes the whole pane: the client's tabs hide and the
  // header shows the campaign's name, with Back closing it. Otherwise the header
  // shows the client's name, with Back to the clients list.
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
    return onBack ? { label: "Back to clients", onClick: () => latest.current.onBack?.() } : null
  }, [phone, campaignOpen, onBack])
  usePageHeaderTitle(useMemo(() => headerTitle ? <span className="block truncate">{headerTitle}</span> : null, [headerTitle]))
  usePageHeaderBack(headerBack)

  // The client's sections replace the dashboard sidebar links, with a way back to Clients.
  const router = useRouter()
  const inSidebar = useSidebarTakeover({
    title: company.name,
    backLabel: "Clients",
    onBack: () => (latest.current.onBack ? latest.current.onBack() : router.push("/dashboard/clients")),
    items: sections.map((item) => ({ key: item.key, label: item.label, icon: item.icon ?? Building2 })),
    active: section,
    onSelect: (key) => router.push(sectionHref(key as typeof section), { scroll: false }),
    level: 1,
  })

  const primaryContact = people.find((person) => person.adminUser?.uid === company.primaryContactId)
    || people.find((person) => person.adminUser?.email)
  // `admin` and the people are rebuilt on every render, so the header actions
  // depend on these plain values instead. Depending on the objects made a new
  // header each render, which re-rendered the page, in a loop.
  const sharePath = admin?.sharePath
  const recipientEmail = primaryContact?.adminUser?.email
  const recipientName = primaryContact?.adminUser?.displayName || primaryContact?.name

  const shareUrl = sharePath ? absoluteUrl(sharePath) : ""
  const campaignSharePath = campaignId
    ? `/${encodeURIComponent(company.slug || company.id)}/projects?campaign=${encodeURIComponent(campaignId)}`
    : ""
  const teamKey = JSON.stringify(people.map((person) => ({ id: person.id, name: person.name, email: person.email, photoUrl: person.photoUrl })))
  const canManageTeam = Boolean(admin)

  const headerActions = useMemo(() => {
    if (campaignId && campaignTitle && campaignSharePath) {
      return (
        <ShareDialog
          path={campaignSharePath}
          title={`Share ${campaignTitle}`}
          shareText={`See the ${campaignTitle} campaign`}
        />
      )
    }
    if (!sharePath) return null
    return (
      <div className="flex items-center gap-2">
        <HeaderTeam
          company={{ id: company.id, name: company.name }}
          people={JSON.parse(teamKey)}
          canManageTeam={canManageTeam}
          shareUrl={shareUrl}
        />
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
  }, [campaignId, campaignSharePath, campaignTitle, sharePath, shareUrl, teamKey, canManageTeam, company.id, company.name, recipientEmail, recipientName])

  usePageHeaderActions(headerActions)
  useClientOpen(Boolean(sharePath))

  return (
    <main className={embedded ? "w-full min-w-0" : "mx-auto min-h-screen w-full max-w-7xl max-md:bg-page px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-16 sm:pt-8 md:pt-6"}>
      {!embedded && (
        <div className="mb-4 flex min-w-0 items-center justify-between gap-4">
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/clients">Clients</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">{company.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {sharePath && (
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href={sharePath}>
                <Eye className="size-4" aria-hidden="true" />
                Visit
              </Link>
            </Button>
          )}
        </div>
      )}
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
