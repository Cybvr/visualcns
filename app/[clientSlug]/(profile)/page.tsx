"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Receipt, ShoppingCart, Upload } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { HomeOverview } from "@/components/company/home-overview"
import { useCompanyFiles } from "@/components/company/sections/files-section"
import { SectionHeader } from "@/components/dashboard/section-header"
import { invoiceIsOpen } from "@/lib/invoice-reminders"
import { tsToMillis } from "@/lib/tasks"

const QUICK_ACTION_CLASS = "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl bg-muted/50 px-3 py-4 text-center text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"

export default function CompanyHomePage() {
  const { company, invoices, sectionHref } = useCompanyPage()
  const { user, appUser } = useAuth()
  const firstName = (appUser?.displayName || user?.displayName || "").trim().split(/\s+/)[0]
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirected = useRef(false)
  // Uploads from the quick action go straight into the company's Documents.
  const files = useCompanyFiles()

  // Older links put the section in ?tab=, and shared document links used /{slug}?doc=.
  // Task links intentionally stay on this page so TaskDetailSheet can open in place.
  const tab = searchParams.get("tab")
  const legacySettings = tab === "about"
  const legacySection = tab === "media" || tab === "documents" || tab === "finance" || tab === "drive" || tab === "notes"
    ? "documents"
    : isCompanySection(tab) && tab !== "about"
      ? tab
      : searchParams.get("doc")
        ? "documents"
        : null

  useEffect(() => {
    if ((!legacySection && !legacySettings) || redirected.current) return
    redirected.current = true
    const query = Object.fromEntries(searchParams.entries())
    delete query.tab
    if (legacySettings) {
      const homePath = sectionHref("about").split("?")[0]
      const nextSearch = new URLSearchParams(query).toString()
      router.replace(`${homePath}/settings${nextSearch ? `?${nextSearch}` : ""}`)
      return
    }
    router.replace(sectionHref(legacySection!, query))
  }, [legacySection, legacySettings, router, searchParams, sectionHref])

  if (legacySection || legacySettings) return null

  const signedInAt = user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null
  const companyPath = `/${encodeURIComponent(company.slug || company.id)}`
  // The oldest unpaid invoice comes first, since it's the one to pay.
  const unpaid = invoices.filter(invoiceIsOpen).sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))[0]
  const quickActions: Array<{ key: string; label: string; icon: typeof Receipt; href?: string; onClick?: () => void }> = [
    ...(unpaid ? [{ key: "pay", label: "Pay an invoice", icon: Receipt, href: sectionHref("documents", { doc: `invoice:${unpaid.id}` }) }] : []),
    ...(user ? [{ key: "checkout", label: "Buy services", icon: ShoppingCart, href: `${companyPath}/checkout` }] : []),
    // A button, not a link: the file picker only opens straight from a click.
    ...(user ? [{ key: "upload", label: "Upload a file", icon: Upload, onClick: files.upload }] : []),
  ]

  return (
    <>
      <h1 className="surface-record-title mt-2 truncate">
        {firstName ? `Welcome back, ${firstName}` : `Welcome to ${company.name}`}
      </h1>
      {signedInAt && (
        <p className="surface-caption mt-1">
          Signed in {signedInAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}

      {quickActions.length > 0 && (
        <section aria-labelledby="home-quick-actions-heading" className="mt-6 mb-8">
          <SectionHeader id="home-quick-actions-heading" title="Quick actions" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickActions.map(({ key, label, icon: Icon, href, onClick }) => {
              const content = <><Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="leading-snug">{label}</span></>
              return href
                ? <Link key={key} href={href} className={QUICK_ACTION_CLASS}>{content}</Link>
                : <button key={key} type="button" onClick={onClick} className={QUICK_ACTION_CLASS}>{content}</button>
            })}
          </div>
        </section>
      )}
      {files.dialogs}
      <HomeOverview />
    </>
  )
}
