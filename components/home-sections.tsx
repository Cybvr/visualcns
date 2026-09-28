import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { PortfolioGrid } from "@/components/portfolio-grid"
import type { BrandItem } from "@/lib/brands"
import type { Capability } from "@/lib/capabilities"
import type { BlogPost } from "@/lib/blog"

// Shared by the Products, Capabilities, and News lists. Portfolio deliberately
// breaks the pattern: it renders the portfolio grid so the work itself
// carries that section rather than another row of thumbnails.
const listClass = "grid grid-cols-1 gap-y-8"

const VISITOR_SIGN_UP = `/signup?next=${encodeURIComponent("/dashboard/visitors")}`

const AUDIT_AREAS = [
  { title: "Your website", detail: "Pages, content, structure, products and messaging" },
  { title: "Search visibility", detail: "SEO, keywords and how easy you are to find" },
  { title: "Competitors", detail: "Positioning, recent activity and market trends" },
  { title: "Market opportunities", detail: "Events, partners, tenders, grants and more" },
  { title: "Technical health", detail: "Speed, broken pages and best practices" },
  { title: "Your online presence", detail: "Brand mentions, content and reputation" },
]

// Every section is open on the page: a numbered heading over its content.
function Section({ id, number, title, children }: { id: string; number: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`home-${id}`} className="border-t border-border py-10 md:py-14">
      <h2 id={`home-${id}`} className="mb-6 text-2xl text-foreground md:mb-8 md:text-3xl">
        {number}. {title}
      </h2>
      {children}
    </section>
  )
}

// Thumbnail + title row shared by Products, Capabilities, and News.
function MediaRow({
  href,
  title,
  image,
  imageAlt,
  imagePosition,
  fit = "cover",
}: {
  href: string
  title: string
  image?: string
  imageAlt?: string
  imagePosition?: string
  fit?: "cover" | "contain"
}) {
  return (
    <li className="border-b border-border pb-4">
      <Link href={href} className="block group">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="h-16 w-24 shrink-0 overflow-hidden bg-muted">
            <img
              src={image || "/placeholder.svg?height=300&width=480&query=visualcns"}
              alt={imageAlt || title}
              style={imagePosition ? { objectPosition: imagePosition } : undefined}
              className={
                fit === "contain"
                  ? "h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                  : "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl text-foreground transition-colors group-hover:text-accent md:text-3xl line-clamp-1">
              {title}
            </h3>
          </div>
        </div>
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
      <Section id="about" number={1} title="About">
        <p className="max-w-3xl text-muted-foreground">
          A global creative consultancy that develops digital experiences, brand systems, and technology solutions for
          modern businesses.
        </p>
      </Section>

      <Section id="case-studies" number={2} title="Case Studies">
        <PortfolioGrid compact limit={8} showNumbers={false} />
      </Section>

      <Section id="products" number={3} title="Products">
        <ul className={listClass}>
          {products.map((p) => (
            <MediaRow
              key={p.slug}
              href={p.href}
              title={`${p.name} — ${p.product}`}
              image={p.screenshot || p.logo}
              imageAlt={`${p.name} ${p.product}`}
              // Logos need breathing room; product screenshots can fill the frame.
              fit={p.screenshot ? "cover" : "contain"}
            />
          ))}
        </ul>
      </Section>

      <Section id="visitor-sign-in" number={4} title="Visitor Sign-in">
        <div className="max-w-3xl space-y-6">
          <p className="text-muted-foreground">
            A sign-in page for your front desk. Visitors sign in on a tablet or their own phone, hosts get an email when
            they arrive, and you always know who is on site.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link href={VISITOR_SIGN_UP}>Start free trial</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/visitors/demo">Try the demo</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section id="business-audit" number={5} title="Business Audit">
        <div className="space-y-6">
          <p className="max-w-3xl text-muted-foreground">
            A full check of how your business shows up online, with a clear list of what to fix first.
          </p>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIT_AREAS.map((area) => (
              <li key={area.title} className="border-b border-border pb-4">
                <p className="text-foreground">{area.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{area.detail}</p>
              </li>
            ))}
          </ul>
          <Button asChild className="rounded-full">
            <Link href="/signup">Get your audit</Link>
          </Button>
        </div>
      </Section>

      <Section id="services" number={6} title="Services">
        <ul className={listClass}>
          {capabilities.map((c) => (
            <MediaRow
              key={c.slug}
              href={`/capabilities/${c.slug}`}
              title={c.title}
              image={c.image}
              imageAlt={c.imageAlt}
            />
          ))}
        </ul>
      </Section>

      <Section id="news" number={7} title="Latest News and Insights">
        <ul className={listClass}>
          {news.map((item) => (
            <MediaRow
              key={item.slug}
              href={`/blog/${item.slug}`}
              title={item.title}
              image={item.image}
              imageAlt={item.imageAlt}
              imagePosition={item.imagePosition}
            />
          ))}
        </ul>
      </Section>
    </div>
  )
}
