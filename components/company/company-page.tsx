"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ExternalLink, LogOut, Mail, MoreVertical } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import {
  CompanyPageProvider,
  useCompanyPage,
  type CompanyPageData,
} from "@/components/company/company-page-context"
import { HeaderTeam } from "@/components/company/header-team"
import { CompanyProfileHeader } from "@/components/company/company-profile-header"
import { SectionNav } from "@/components/company/section-nav"
import { CompanySection } from "@/components/company/sections/company-section"
import { useClientOpen, usePageHeaderActions, usePageHeaderBack, usePageHeaderTitle } from "@/components/dashboard/page-title-context"
import { ImageDropzone } from "@/components/image-dropzone"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const { company, people, admin, sections, section, sectionHref, absoluteUrl, projects, updateParams } = useCompanyPage()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [logoEditOpen, setLogoEditOpen] = useState(false)

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

  const primaryContact = people.find((person) => person.adminUser?.uid === company.primaryContactId)
    || people.find((person) => person.adminUser?.email)
  // `admin` and the people are rebuilt on every render, so the header actions
  // depend on these plain values instead. Depending on the objects made a new
  // header each render, which re-rendered the page, in a loop.
  const sharePath = admin?.sharePath
  const recipientEmail = primaryContact?.adminUser?.email
  const recipientName = primaryContact?.adminUser?.displayName || primaryContact?.name

  const shareUrl = sharePath ? absoluteUrl(sharePath) : ""
  const teamKey = JSON.stringify(people.map((person) => ({ id: person.id, name: person.name, email: person.email, photoUrl: person.photoUrl })))
  const canManageTeam = Boolean(admin)

  const headerActions = useMemo(() => sharePath ? (
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
  ) : null, [sharePath, shareUrl, teamKey, canManageTeam, company.id, company.name, recipientEmail, recipientName])

  usePageHeaderActions(headerActions)
  useClientOpen(Boolean(sharePath))

  return (
    <main className={embedded ? "w-full min-w-0" : "mx-auto min-h-screen w-full max-w-7xl max-md:bg-page px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-16 sm:pt-6"}>
      {/* Tabs stick under the header while scrolling. In the clients pane the pane itself scrolls, so they stick to its top. */}
      <div className={cn(campaignOpen && "max-sm:hidden", embedded
        ? "sticky top-0 z-30 border-b border-border bg-background print:hidden"
        : "sticky top-14 z-30 -mx-4 -mt-4 border-b border-border bg-background print:hidden sm:-mx-6 sm:-mt-6 md:static md:mx-0 md:mt-0")}
      >
        <SectionNav sections={sections} active={section} href={sectionHref} phoneVisible={3} />
      </div>

      {section === "activity" && (
        <CompanyProfileHeader
          name={company.name}
          handle={company.slug || admin?.sharePath.split("/").filter(Boolean).pop()}
          logoUrl={company.logoUrl}
          publicPath={admin?.sharePath}
          onChangeLogo={admin ? () => setLogoEditOpen(true) : undefined}
          accountAction={!admin && user ? (
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
        />
      )}

      <div className="min-w-0">
        <CompanySection section={section} />
      </div>

      {admin && (
        <>
          <Dialog open={logoEditOpen} onOpenChange={setLogoEditOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Company image</DialogTitle>
                <DialogDescription>Choose the image shown beside the company name.</DialogDescription>
              </DialogHeader>
              <ImageDropzone
                compact
                label="Logo"
                value={company.logoUrl || ""}
                onChange={(url) => {
                  void admin.onUpdateCompany({ logoUrl: url }).then(() => setLogoEditOpen(false))
                }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
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
