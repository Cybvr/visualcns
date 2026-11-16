"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Globe, Megaphone, Palette, X } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

import { useAuth } from "@/components/auth-provider"
import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Button } from "@/components/ui/button"
import { AppScene, GrowthScene, SupportScene, WebsiteScene } from "@/components/home-feature-illustrations"
import { useLocalCurrency } from "@/components/use-local-currency"
import { formatPrice, growthPlanRows } from "@/lib/plans"

/** The featured offer, shown above the quick actions until it is dismissed. */
const FEATURED = { key: "growth", tab: "growth", title: "Grow with a Growth plan", text: "Campaigns, content and reports handled for you every month." }
/** The cheapest paid Growth plan, shown as the "From" price. */
const GROWTH_FROM_PRICE = growthPlanRows.find((row) => row.service === "Pro")?.price ?? "free"
const FEATURED_DISMISSED_KEY = "home-featured-growth-dismissed"

/** Things from the pricing page worth suggesting, each opening its pricing tab, drawn like the home page features. */
const RECOMMENDED: { key: string; tab: string; Scene: ComponentType<SVGProps<SVGSVGElement>>; title: string; text: string }[] = [
  { key: "website", tab: "development", Scene: WebsiteScene, title: "Get a website that sells", text: "A fast site you can edit yourself, on Webflow, Framer or WordPress." },
  { key: "app", tab: "development", Scene: AppScene, title: "Build your app", text: "Test an idea with a clickable product, or launch a full web app." },
  { key: "support", tab: "support", Scene: SupportScene, title: "Keep your business running", text: "Monthly support hours from our team when you need a hand." },
]

/** The soft blue wash the home page puts behind its feature drawings. */
const SCENE_BACKGROUND = "bg-gradient-to-br from-primary/30 via-primary/10 to-white dark:from-primary/35 dark:via-primary/10 dark:to-white/10"

/** "Nov 16, 2026, 04:25 AM (EST)", in the viewer's own time zone. */
function lastLoginLabel(date: Date) {
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  const zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value
  return `${day}, ${time}${zone ? ` (${zone})` : ""}`
}

export default function CompanyHomePage() {
  const { company, sectionHref } = useCompanyPage()
  const { user, appUser } = useAuth()
  const firstName = (appUser?.displayName || user?.displayName || "").trim().split(/\s+/)[0]
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirected = useRef(false)
  const [featuredDismissed, setFeaturedDismissed] = useState(true)
  const currency = useLocalCurrency()

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
    { key: "sites", label: "Sites", icon: Globe, href: sectionHref("sites"), tone: "bg-violet-500/15 text-violet-500" },
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
          Last logged in on {lastLoginLabel(signedInAt)}
        </p>
      )}

      {!featuredDismissed && (
        <section aria-label={FEATURED.title} className="relative mt-6 flex items-stretch gap-4 rounded-2xl bg-muted/50 p-4 pr-10">
          <button type="button" onClick={dismissFeatured} aria-label="Dismiss" className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" aria-hidden="true" />
          </button>
          {/* Stretches to the card's text, from the title to the bottom of the button. */}
          <span className={`flex w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl p-2 sm:w-44 ${SCENE_BACKGROUND}`}>
            <GrowthScene className="h-auto w-full" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-medium leading-snug text-foreground">{FEATURED.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{FEATURED.text}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">From {formatPrice(GROWTH_FROM_PRICE, currency)}</p>
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
        {/* Phones: a swipeable row with the next card peeking in. Wider screens: three across. */}
        <div className="scrollbar-none -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {RECOMMENDED.map(({ key, tab, Scene, title, text }) => (
            <Link
              key={key}
              href={`${companyPath}/pricing/${tab}`}
              className="flex w-[80%] shrink-0 snap-start flex-col gap-3 rounded-2xl bg-muted/50 p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
            >
              <span className={`block aspect-[16/11] overflow-hidden rounded-xl p-4 ${SCENE_BACKGROUND}`}>
                <Scene className="size-full" />
              </span>
              <span className="min-w-0 px-1 pb-1">
                <span className="block text-base font-medium leading-snug text-foreground">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
