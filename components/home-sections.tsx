import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BookNowModal } from "@/components/book-now-modal"
import { HomeCaseStudies } from "@/components/home-case-studies"
import { ConsultingScene, NgaiScene, PulseScene, VisitorScene } from "@/components/home-feature-illustrations"
import type { Capability } from "@/lib/capabilities"
import type { BlogPost } from "@/lib/blog"


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

export function HomeSections({
  capabilities,
  news,
}: {
  capabilities: Capability[]
  news: BlogPost[]
}) {
  const container = "mx-auto max-w-7xl px-4 sm:px-8 md:px-20"

  const features: { title: string; description: string; points: string[]; href: string; illustration: ReactNode }[] = [
    {
      title: "Visitor Sign-in",
      description: "Replace the paper visitor book with a quick sign-in at the front desk.",
      points: ["Guests check in on a tablet or their phone", "Hosts get an email straight away", "A clear record of who came and when", "Free for 30 days, no card needed"],
      href: "/pass",
      illustration: <VisitorScene className="size-full" />,
    },
    {
      title: "Ngai",
      description: "An AI assistant that knows your business and does the writing for you.",
      points: ["Answers questions from your business info", "Writes newsletters, campaigns and emails", "Plans tasks you approve before it acts", "Included on every plan"],
      href: "/help",
      illustration: <NgaiScene className="size-full" />,
    },
    {
      title: "Pulse",
      description: "See how your business shows up online and what to fix first.",
      points: ["Checks search, maps, your website and social pages", "Scores what customers see", "A short list of fixes, in order", "First report in about two minutes"],
      href: "/pulse",
      illustration: <PulseScene className="size-full" />,
    },
    {
      title: "Consulting",
      description: "Work with our team on your brand, product, campaigns and customer experience.",
      points: ["Decide what to do and why", "Design it properly", "Launch a new identity, website, app or campaign"],
      href: "/capabilities",
      illustration: <ConsultingScene className="size-full" />,
    },
  ]

  return (
    <div className="w-full">
      <div className={container}>

      {/* Features (no heading): one per row, picture and words swapping sides down the page. */}
      <section aria-label="Features" className="py-14 md:py-20">
        <div className="space-y-14 md:space-y-20">
          {features.map((feature, index) => (
            <div key={feature.title} className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className={`aspect-[16/11] overflow-hidden rounded-[0.75rem] bg-muted/50 p-6 ${index % 2 ? "md:order-2" : ""}`}>
                {feature.illustration}
              </div>
              <div className={index % 2 ? "md:order-1" : ""}>
                <h3 className="text-2xl tracking-[-0.02em] text-foreground md:text-3xl">{feature.title}</h3>
                <p className="mt-3 max-w-lg text-base leading-7 text-muted-foreground md:text-lg md:leading-8">{feature.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm text-muted-foreground md:text-base">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary md:size-5" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-6 rounded-full">
                  <Link href={feature.href}>Learn more</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      </div>

      {/* Case studies run edge to edge, outside the page width. */}
      <HomeCaseStudies />

      <div className={`${container} pb-8`}>
      <Section id="news" title="News & Insights" viewAllHref="/blog">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {news.slice(0, 4).map((item) => (
            <li key={item.slug}>
              <Link href={`/blog/${item.slug}`} className="group block">
                <div className="aspect-[16/10] overflow-hidden rounded-[0.75rem] bg-muted">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.imageAlt || ""}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                      style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
                    />
                  ) : null}
                </div>
                {item.categories?.length ? <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.categories[0]}</p> : null}
                <h3 className="mt-2 line-clamp-2 text-lg tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">{item.title}</h3>
              </Link>
            </li>
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
