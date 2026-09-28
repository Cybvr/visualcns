import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BookNowModal } from "@/components/book-now-modal"
import { PortfolioGrid } from "@/components/portfolio-grid"
import type { BrandItem } from "@/lib/brands"
import type { Capability } from "@/lib/capabilities"
import type { BlogPost } from "@/lib/blog"

const VISITOR_SIGN_UP = `/signup?next=${encodeURIComponent("/dashboard/visitors")}`

const AUDIT_AREAS = [
  "Your website — pages, content, structure and messaging",
  "Search visibility — SEO, keywords and how easy you are to find",
  "Competitors — positioning, recent activity and market trends",
  "Market opportunities — events, partners, tenders and grants",
  "Technical health — speed, broken pages and best practices",
  "Your online presence — brand mentions, content and reputation",
]

// Editorial section frame: a big title on the left, a mono index tag on the
// right, a hairline underneath. Every block on the page shares it.
function Section({
  id,
  index,
  title,
  kicker,
  children,
}: {
  id: string
  index: string
  title: string
  kicker: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`home-${id}`} className="py-14 md:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-5 md:mb-14">
        <h2 id={`home-${id}`} className="text-3xl tracking-[-0.03em] text-foreground md:text-5xl">
          {title}
        </h2>
        <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {index} — {kicker}
        </span>
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
        <span className="font-mono text-xs tabular-nums text-muted-foreground transition-colors group-hover:text-accent">
          {number}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-3xl tracking-[-0.02em] text-foreground transition-colors group-hover:text-accent md:text-5xl">
            {title}
          </span>
          {meta ? <span className="mt-2 block text-sm text-muted-foreground">{meta}</span> : null}
        </span>
        <ArrowUpRight className="size-5 justify-self-end text-muted-foreground transition-[transform,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none" />
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
  return (
    <div className="w-full">
      <Section id="work" index="01" title="Selected Work" kicker="Case studies">
        <PortfolioGrid compact limit={8} showNumbers={false} />
        <div className="mt-10">
          <Link
            href="/case-studies"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-accent"
          >
            All case studies
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </Section>

      {/* Products: large image cards so the work carries the section. */}
      <Section id="products" index="02" title="Products" kicker="What we ship">
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
          {products.map((p) => (
            <Link key={p.slug} href={p.href} className="group block">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.screenshot || p.logo || "/placeholder.svg?height=600&width=800&query=visualcns"}
                  alt={`${p.name} ${p.product}`}
                  className={
                    p.screenshot
                      ? "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      : "h-full w-full object-contain p-10 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  }
                />
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-2xl tracking-[-0.02em] text-foreground transition-colors group-hover:text-accent md:text-3xl">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.product}</p>
                </div>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-[transform,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none" />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Services: big numbered rows, editorial and quiet. */}
      <Section id="services" index="03" title="Services" kicker="How we help">
        <ul>
          {capabilities.map((c, i) => (
            <BigRow
              key={c.slug}
              href={`/capabilities/${c.slug}`}
              number={String(i + 1).padStart(2, "0")}
              title={c.title}
            />
          ))}
        </ul>
      </Section>

      {/* Two products of ours, presented as plain text + one action each. */}
      <Section id="tools" index="04" title="Tools You Can Use Today" kicker="Self-serve">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col">
            <h3 className="text-2xl tracking-[-0.02em] text-foreground md:text-3xl">Visitor Sign-in</h3>
            <p className="mt-4 max-w-md text-muted-foreground">
              A sign-in page for your front desk. Visitors sign in on a tablet or their own phone, hosts get an email
              when they arrive, and you always know who is on site.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <Link href={VISITOR_SIGN_UP}>Start free trial</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/visitors/demo">Try the demo</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-2xl tracking-[-0.02em] text-foreground md:text-3xl">Business Audit</h3>
            <p className="mt-4 max-w-md text-muted-foreground">
              A full check of how your business shows up online, with a clear list of what to fix first.
            </p>
            <ul className="mt-6 space-y-3">
              {AUDIT_AREAS.map((area) => (
                <li key={area} className="flex gap-3 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button asChild className="rounded-full">
                <Link href="/signup">Get your audit</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section id="news" index="05" title="News & Insights" kicker="From the studio">
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
        <div className="mt-10">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-accent"
          >
            All articles
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </Section>

      {/* Closing statement — the tagline turned into an invitation. */}
      <section aria-labelledby="home-cta" className="border-t border-border py-20 md:py-28">
        <h2
          id="home-cta"
          className="text-[clamp(2.5rem,9vw,7rem)] font-medium leading-[0.9] tracking-[-0.04em] text-foreground"
        >
          Let&apos;s build
          <span className="text-accent">.</span>
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <BookNowModal triggerLabel="Start a project" triggerClassName="rounded-full" />
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:text-accent"
          >
            Talk to us
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      </section>
    </div>
  )
}
