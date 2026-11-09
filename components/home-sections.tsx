import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BookNowModal } from "@/components/book-now-modal"
import { HomeCaseStudies } from "@/components/home-case-studies"
import { SERVICE_ILLUSTRATIONS, VisitorIllustration, AuditIllustration } from "@/components/home-illustrations"
import type { BrandItem } from "@/lib/brands"
import type { Capability } from "@/lib/capabilities"
import type { BlogPost } from "@/lib/blog"

const VISITOR_SIGN_UP = `/signup?next=${encodeURIComponent("/onboarding")}`

// Editorial section frame: a big title on the left, a mono index tag on the
// right, a hairline underneath. Every block on the page shares it.
function Section({
  id,
  title,
  viewAllHref,
  card = false,
  children,
}: {
  id: string
  title: string
  /** Where "View all" goes; leave out for no link. */
  viewAllHref?: string
  /** Sits on a raised panel so it stands apart from the plain sections around it. */
  card?: boolean
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`home-${id}`} className={card ? "my-6 rounded-3xl bg-card px-5 py-12 md:my-10 md:px-12 md:py-16" : "py-14 md:py-20"}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-14">
        <h2 id={`home-${id}`} className="tracking-[-0.03em] text-foreground">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            View all
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

// Big numbered link row, matching the site's nav overlay: index, title, arrow.
function BigRow({
  href,
  number,
  title,
  meta,
  external,
}: {
  href: string
  number: string
  title: string
  meta?: string
  external?: boolean
}) {
  return (
    <li className="border-t border-border last:border-b">
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="group grid grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-baseline gap-x-4 py-6 md:grid-cols-[4rem_minmax(0,1fr)_2rem] md:gap-x-10 md:py-8"
      >
        <span className="font-mono text-xs tabular-nums text-muted-foreground transition-colors group-hover:text-primary">
          {number}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-2xl tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary md:text-3xl">
            {title}
          </span>
          {meta ? <span className="mt-2 block text-sm text-muted-foreground">{meta}</span> : null}
        </span>
        <ArrowUpRight className="size-5 justify-self-end text-muted-foreground transition-[transform,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none" />
      </Link>
    </li>
  )
}

export function HomeSections({
  products,
  capabilities,
  news,
}: {
  products: BrandItem[]
  capabilities: Capability[]
  news: BlogPost[]
}) {
  // Consulting shows four services as quick links; the full list is on the services page.
  const consulting = capabilities.filter((c) => c.slug !== "visualcns-ventures").slice(0, 4)
  const ConsultingIllustration = consulting[0] ? SERVICE_ILLUSTRATIONS[consulting[0].slug] : undefined
  const container = "mx-auto max-w-7xl px-4 sm:px-8 md:px-20"

  return (
    <div className="w-full">
      <div className={container}>
      {/* Products: large image cards so the work carries the section. */}
      <Section card id="products" title="Products" viewAllHref="/brands">
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <Link key={p.slug} href={p.href} className="group block">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.screenshot || p.logo || "/placeholder.svg?height=600&width=800&query=visualcns"}
                  alt={`${p.name} ${p.product}`}
                  className={
                    p.screenshot
                      ? "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      : "h-full w-full object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  }
                />
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-xl tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.product}</p>
                </div>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-[transform,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none" />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Features: one per row, picture and words swapping sides down the page. */}
      <Section card id="features" title="Features">
        <div className="space-y-14 md:space-y-20">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="aspect-[16/11] overflow-hidden rounded-[0.75rem] bg-muted/50 p-6">
              <VisitorIllustration className="size-full" />
            </div>
            <div>
              <h3 className="text-2xl tracking-[-0.02em] text-foreground md:text-3xl">Visitor Sign-in</h3>
              <p className="mt-2 max-w-md text-muted-foreground">Guests sign in at the front desk. Hosts get an email. Free for 30 days, no card needed.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-full">
                  <Link href={VISITOR_SIGN_UP}>Start free trial</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/visitors/demo">Try the demo</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href="/pass">Learn more</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="aspect-[16/11] overflow-hidden rounded-[0.75rem] bg-muted/50 p-6 md:order-2">
              <AuditIllustration className="size-full" />
            </div>
            <div className="md:order-1">
              <h3 className="text-2xl tracking-[-0.02em] text-foreground md:text-3xl">Pulse</h3>
              <p className="mt-2 max-w-md text-muted-foreground">See how you show up online, and what to fix first.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-full">
                  <Link href="/signup">Get your audit</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href="/pulse">Learn more</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="aspect-[16/11] overflow-hidden rounded-[0.75rem] bg-muted/50 p-6">
              {ConsultingIllustration ? <ConsultingIllustration className="size-full" /> : null}
            </div>
            <div>
              <h3 className="text-2xl tracking-[-0.02em] text-foreground md:text-3xl">Consulting</h3>
              <p className="mt-2 max-w-md text-muted-foreground">Work with our team on your brand, product, campaigns and customer experience.</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {consulting.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/capabilities/${c.slug}`} className="inline-flex rounded-full bg-muted/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:text-primary">
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <BookNowModal triggerLabel="Start a project" triggerClassName="rounded-full" />
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href="/capabilities">See all services</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>
      </div>

      {/* Case studies run edge to edge, outside the page width. */}
      <HomeCaseStudies />

      <div className={`${container} pb-8`}>
      <Section id="news" title="News & Insights" viewAllHref="/blog">
        <ul>
          {news.slice(0, 6).map((item, i) => (
            <BigRow
              key={item.slug}
              href={`/blog/${item.slug}`}
              number={String(i + 1).padStart(2, "0")}
              title={item.title}
              meta={item.categories?.join(" · ")}
            />
          ))}
        </ul>
      </Section>

      {/* Closing statement — the tagline turned into an invitation. */}
      <section aria-labelledby="home-cta" className="border-t border-border py-20 md:py-28">
        <h2
          id="home-cta"
          className="text-[clamp(2.5rem,9vw,7rem)] font-medium leading-[0.9] tracking-[-0.04em] text-foreground"
        >
          Let&apos;s build
          <span className="text-primary">.</span>
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookNowModal triggerLabel="Start a project" triggerClassName="rounded-full" />
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:text-primary"
          >
            Talk to us
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </section>
      </div>
    </div>
  )
}
