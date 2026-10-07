"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ExternalLink, LogOut, Mail, MoreVertical, Share2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import {
  CompanyPageProvider,
  useCompanyPage,
  type CompanyPageData,
} from "@/components/company/company-page-context"
import { CompanyProfileHeader } from "@/components/company/company-profile-header"
import { SectionNav } from "@/components/company/section-nav"
import { CompanySection } from "@/components/company/sections/company-section"
import { usePageHeaderActions } from "@/components/dashboard/page-title-context"
import { ImageDropzone } from "@/components/image-dropzone"
import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { buildEmailComposeHref } from "@/lib/email-composer"

export type { CompanyPageAdmin, CompanyPageCompany, CompanyPagePerson } from "@/components/company/company-page-context"

function DashboardCompanyView({ embedded = false, editHref }: { embedded?: boolean; editHref?: string }) {
  const { company, people, admin, sections, section, sectionHref, goToSection, absoluteUrl } = useCompanyPage()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [logoEditOpen, setLogoEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const primaryContact = people.find((person) => person.adminUser?.uid === company.primaryContactId)
    || people.find((person) => person.adminUser?.email)
  // `admin` and the people are rebuilt on every render, so the header actions
  // depend on these plain values instead. Depending on the objects made a new
  // header each render, which re-rendered the page, in a loop.
  const sharePath = admin?.sharePath
  const recipientEmail = primaryContact?.adminUser?.email
  const recipientName = primaryContact?.adminUser?.displayName || primaryContact?.name

  const headerActions = useMemo(() => sharePath ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More actions"
          title="More actions"
          className="flex size-10 items-center justify-center rounded-xl bg-transparent text-current outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring"
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
        <DropdownMenuItem onSelect={() => setShareOpen(true)}>
          <Share2 className="size-4" aria-hidden="true" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={sharePath} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" aria-hidden="true" />
            Open page
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null, [sharePath, company.id, company.name, recipientEmail, recipientName])

  usePageHeaderActions(headerActions)

  return (
    <main className={embedded ? "w-full min-w-0" : "mx-auto min-h-screen w-full max-w-7xl max-md:bg-page px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-16 sm:pt-6"}>
      <CompanyProfileHeader
        name={company.name}
        handle={company.slug || admin?.sharePath.split("/").filter(Boolean).pop()}
        description={company.description}
        categoryLabel={company.categoryLabel}
        logoUrl={company.logoUrl}
        coverUrl={company.media?.find((url) => url && url !== company.logoUrl)}
        location={company.location}
        website={company.website}
        linkedIn={company.linkedIn}
        contactCount={people.length}
        publicPath={admin?.sharePath}
        admin={Boolean(admin)}
        onShare={admin ? () => setShareOpen(true) : undefined}
        onEdit={admin ? () => router.push(editHref ?? `${pathname}/edit`) : undefined}
        onChangeLogo={admin ? () => setLogoEditOpen(true) : undefined}
        onChangeCover={admin ? () => goToSection("drive") : undefined}
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
        tabs={<SectionNav sections={sections} active={section} href={sectionHref} />}
      />

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

          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share company page</DialogTitle>
                <DialogDescription>Copy this link to share {company.name}&apos;s client page.</DialogDescription>
              </DialogHeader>
              <ShareLinkActions
                url={absoluteUrl(admin.sharePath)}
                label="Company link"
                shareText={`See ${company.name}'s company page`}
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
export function CompanyPage({ embedded, editHref, ...props }: CompanyPageData & { embedded?: boolean; editHref?: string }) {
  return (
    <CompanyPageProvider mode="tabs" {...props}>
      <DashboardCompanyView embedded={embedded} editHref={editHref} />
    </CompanyPageProvider>
  )
}
