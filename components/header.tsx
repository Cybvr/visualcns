"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowUpRight, ChevronDown } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getBrandItems } from "@/lib/brands"
import { capabilities } from "@/lib/capabilities"

import "./header.css"

const brands = getBrandItems()

const productNavItems = brands
  .filter((item) => item.slug !== "visualhq")
  .map((item) => ({ name: item.name, href: item.href, description: item.description }))

const consultingNavItems = [
  { name: "VisualHQ", href: "/visualhq", description: "Who we are and what we do." },
  { name: "About", href: "/about", description: "Our story, values, and team." },
  { name: "Case Studies", href: "/case-studies", description: "Explore our work and client projects." },
  { name: "Solutions", href: "/capabilities", description: "Explore VisualCNS solutions." },
  { name: "Industries", href: "/industries", description: "See the markets VisualHQ builds for." },
  { name: "FAQ", href: "/faq", description: "Answers about VisualCNS and our services." },
]

const bookNowHref = "/contact"

const primaryNavItems = [
  { name: "Case Studies", href: "/case-studies" },
]

// Rendered after the Resources dropdown so the order reads:
// Case Studies, Solutions, Resources, Pricing, More.
const trailingNavItems = [
  { name: "Pricing", href: "/pricing" },
]

const serviceNavItems = capabilities.map((service) => ({
  name: service.title,
  href: `/capabilities/${service.slug}`,
  description: service.description,
}))

const resourceNavItems = [
  { name: "About", href: "/about", description: "Our story, values, and team." },
  { name: "Templates", href: "/templates", description: "Ready-to-use starting points." },
  { name: "News", href: "/blog", description: "Updates, guides, and announcements." },
]

type MenuRow =
  | { number: string; title: string; items: Array<{ name: string; href: string }>; href?: never }
  | { number: string; title: string; href: string; items?: never }

/** Secondary destinations, reorganised as a single numbered menu. */
const MENU_ROWS: MenuRow[] = [
  { number: "01", title: "Software", items: productNavItems },
  { number: "02", title: "Consulting", items: consultingNavItems },
  { number: "03", title: "Templates", href: "/templates" },
  { number: "04", title: "Pricing", href: "/pricing" },
  { number: "05", title: "Resources", items: resourceNavItems },
  { number: "06", title: "Careers", href: "https://pasive.co/jobs" },
]

const MONO_LABEL = "font-mono text-[0.6875rem] uppercase tracking-[0.24em]"
// Top-nav links use the body (sans) font, not the mono label style.
const NAV_LABEL = "text-sm font-medium"

export function Header() {
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  // Any navigation dismisses the menu.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const root = headerRef.current
    if (!root) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        return
      }
      if (event.key !== "Tab" || !root) return

      // Focus stays inside the header while the menu owns the viewport.
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((node) => node.offsetParent !== null)
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    // When the index is open the header owns the viewport, so the panel can be a
    // flex child instead of chasing the bar's height with a hard-coded offset.
    <header ref={headerRef} className={`fixed inset-x-0 top-0 z-50 flex flex-col ${open ? "bottom-0" : ""}`}>
      <div
        className="shrink-0 border-b border-border bg-background/90 text-foreground backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 md:px-20 md:py-5">
          <div className="flex items-center gap-3 md:gap-5">
            <Link href="/" aria-label="VisualCNS home">
              <BrandLockup logoSize={28} gapClassName="gap-1" />
            </Link>

            <nav className="hidden items-center gap-4 lg:flex" aria-label="Primary navigation">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={`transition-colors hover:text-accent ${NAV_LABEL} ${
                    isCurrent(item.href) ? "text-accent" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}

              {/* This is a lightweight navigation popover; keeping the page scrollable prevents the scrollbar from disappearing and shifting the layout. */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-current={isCurrent("/capabilities") ? "page" : undefined}
                    className={`inline-flex items-center gap-1 outline-none transition-colors hover:text-accent focus-visible:text-accent ${NAV_LABEL} ${
                      isCurrent("/capabilities") ? "text-accent" : ""
                    }`}
                  >
                    Solutions
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={16} className="w-80 rounded-2xl border-border p-2 shadow-xl">
                  <DropdownMenuItem asChild className="rounded-xl focus:bg-muted">
                    <Link href="/capabilities" className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5">
                      <span className={`font-semibold text-foreground ${NAV_LABEL}`}>All Solutions</span>
                      <span className="text-xs font-normal text-muted-foreground">Explore everything we build.</span>
                    </Link>
                  </DropdownMenuItem>
                  {serviceNavItems.map((service) => (
                    <DropdownMenuItem key={service.href} asChild className="rounded-xl focus:bg-muted">
                      <Link href={service.href} className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5">
                        <span className={`font-medium text-foreground ${NAV_LABEL}`}>{service.name}</span>
                        {service.description && <span className="line-clamp-2 text-xs font-normal text-muted-foreground">{service.description}</span>}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-current={isCurrent("/blog") ? "page" : undefined}
                    className={`inline-flex items-center gap-1 outline-none transition-colors hover:text-accent focus-visible:text-accent ${NAV_LABEL} ${
                      isCurrent("/blog") ? "text-accent" : ""
                    }`}
                  >
                    Resources
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={16} className="w-80 rounded-2xl border-border p-2 shadow-xl">
                  {resourceNavItems.map((resource) => (
                    <DropdownMenuItem key={resource.href} asChild className="rounded-xl focus:bg-muted">
                      <Link href={resource.href} className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5">
                        <span className={`font-medium text-foreground ${NAV_LABEL}`}>{resource.name}</span>
                        {resource.description && <span className="text-xs font-normal text-muted-foreground">{resource.description}</span>}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {trailingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={`transition-colors hover:text-accent ${NAV_LABEL} ${
                    isCurrent(item.href) ? "text-accent" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Menu toggle, at the end of the nav — plain text, no icon. */}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open more navigation"}
              className={`inline-flex items-center outline-none transition-colors hover:text-accent focus-visible:text-accent ${NAV_LABEL} ${open ? "text-accent" : "text-foreground"}`}
            >
              {open ? "Close" : "More"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className={NAV_LABEL}>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className={NAV_LABEL}>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="More site navigation"
          className="hdr-panel min-h-0 flex-1 overflow-y-auto bg-background"
        >
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-8 md:px-20 md:pt-10">
            <ul>
              {MENU_ROWS.map((row, rowIndex) => (
                <li
                  key={row.number}
                  className="hdr-row border-t border-border"
                  style={{ "--i": rowIndex } as CSSProperties}
                >
                  {row.href ? (
                    <Link
                      href={row.href}
                      onClick={() => setOpen(false)}
                      aria-current={isCurrent(row.href) ? "page" : undefined}
                      className="group grid grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-baseline gap-x-4 py-6 outline-none md:grid-cols-[4rem_minmax(0,1fr)_2rem] md:gap-x-10 md:py-8"
                    >
                      <span
                        className={`font-mono text-xs tabular-nums transition-colors group-hover:text-accent ${
                          isCurrent(row.href) ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        {row.number}
                      </span>
                      <span className="text-3xl tracking-[-0.02em] text-foreground transition-colors group-hover:text-accent md:text-5xl">
                        {row.title}
                      </span>
                      <ArrowUpRight className="size-5 justify-self-end text-muted-foreground transition-[transform,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none" />
                    </Link>
                  ) : (
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-4 py-6 md:grid-cols-[4rem_minmax(0,20rem)_minmax(0,1fr)] md:gap-x-10 md:py-8">
                      <span className="col-start-1 row-start-1 font-mono text-xs tabular-nums text-muted-foreground">
                        {row.number}
                      </span>
                      <span className="col-start-2 row-start-1 text-3xl tracking-[-0.02em] text-foreground md:text-5xl">
                        {row.title}
                      </span>
                      <ul className="col-start-2 row-start-2 flex flex-wrap gap-x-6 gap-y-3 md:col-start-3 md:row-start-1 md:justify-end">
                        {row.items?.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              aria-current={isCurrent(item.href) ? "page" : undefined}
                              className={`transition-colors hover:text-accent ${MONO_LABEL} ${
                                isCurrent(item.href) ? "text-accent" : "text-muted-foreground"
                              }`}
                            >
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-10 border-t border-border pt-8 lg:hidden">
              <Button asChild className={`w-full px-5 ${MONO_LABEL}`}>
                <Link href={bookNowHref} onClick={() => setOpen(false)}>
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
