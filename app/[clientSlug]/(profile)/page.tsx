"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageCircle, Megaphone, Palette, X } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Button } from "@/components/ui/button"

/** The featured offer, shown above the quick actions until it is dismissed. */
const FEATURED = { key: "growth", tab: "growth", image: "/services/campaign-content-design.png", title: "Grow with a Growth plan", text: "Campaigns, content and reports handled for you every month." }
const FEATURED_DISMISSED_KEY = "home-featured-growth-dismissed"

/** Things from the pricing page worth suggesting, each opening its pricing tab. */
const RECOMMENDED = [
  { key: "website", tab: "development", image: "/services/product-experience-design.png", title: "Get a website that sells", text: "A fast site you can edit yourself, on Webflow, Framer or WordPress." },
  { key: "app", tab: "development", image: "/services/ai-design.png", title: "Build your app", text: "Test an idea with a clickable product, or launch a full web app." },
  { key: "support", tab: "support", image: "/services/crm-relationship-design.png", title: "Keep your business running", text: "Monthly support hours from our team when you need a hand." },
]

export default function CompanyHomePage() {
  const { company, sectionHref } = useCompanyPage()
  const { user, appUser } = useAuth()
  const firstName = (appUser?.displayName || user?.displayName || "").trim().split(/\s+/)[0]
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirected = useRef(false)
  const [featuredDismissed, setFeaturedDismissed] = useState(true)

  useEffect(() => {
    try { setFeaturedDismissed(window.localStorage.getItem(FEATURED_DISMISSED_KEY) === "1") } catch { setFeaturedDismissed(false) }
  }, [])

  function dismissFeatured() {
    setFeaturedDismissed(true)
    try { window.localStorage.setItem(FEATURED_DISMISSED_KEY, "1") } catch {}
  }

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
  const quickActions = [
    { key: "chats", label: "Chats", icon: MessageCircle, href: sectionHref("ngai"), tone: "bg-violet-500/15 text-violet-500" },
    { key: "campaigns", label: "Campaigns", icon: Megaphone, href: sectionHref("projects"), tone: "bg-orange-500/15 text-orange-500" },
    { key: "brand-kit", label: "Brand Kit", icon: Palette, href: `${companyPath}/brand-kit`, tone: "bg-pink-500/15 text-pink-500" },
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

      {!featuredDismissed && (
        <section aria-label={FEATURED.title} className="relative mt-6 flex items-center gap-4 rounded-2xl bg-muted/50 p-4 pr-10">
          <button type="button" onClick={dismissFeatured} aria-label="Dismiss" className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" aria-hidden="true" />
          </button>
          <span className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28">
            <Image src={FEATURED.image} alt="" fill sizes="112px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-medium leading-snug text-foreground">{FEATURED.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{FEATURED.text}</p>
            <Button asChild size="sm" className="mt-3">
              <Link href={`${companyPath}/pricing/${FEATURED.tab}`}>Get started</Link>
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="home-quick-actions-heading" className="mt-6">
        <SectionHeader id="home-quick-actions-heading" title="Quick actions" />
        <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {quickActions.map(({ key, label, icon: Icon, href, tone }) => (
            <Link key={key} href={href} className="group flex w-24 shrink-0 flex-col gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className={`flex aspect-square w-full items-center justify-center rounded-xl transition-opacity group-hover:opacity-80 ${tone}`}>
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <span className="text-sm leading-snug text-muted-foreground group-hover:text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="home-recommended-heading" className="mt-8 mb-8">
        <SectionHeader id="home-recommended-heading" title="Recommended for you" />
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {RECOMMENDED.map((item) => (
            <Link
              key={item.key}
              href={`${companyPath}/pricing/${item.tab}`}
              className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28">
                <Image src={item.image} alt="" fill sizes="112px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-medium leading-snug text-foreground">{item.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{item.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
