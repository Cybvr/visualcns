import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getCapabilities, getCapabilityBySlug, type Capability } from "@/lib/capabilities"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const capability = getCapabilityBySlug(slug)
  if (!capability) return {}
  return publicPageMetadata({
    title: `${capability.title} | VisualCNS`,
    description: capability.description,
    path: `/capabilities/${slug}`,
    ...(capability.image ? { image: capability.image } : {}),
  })
}

export function generateStaticParams() {
  return getCapabilities().map((capability) => ({ slug: capability.slug }))
}

function pad(index: number) {
  return String(index + 1).padStart(2, "0")
}

/**
 * The rest of the set, numbered by their position in the full list so the
 * numerals stay stable wherever a visitor lands.
 */
function SiblingNav({ siblings }: { siblings: Array<Capability & { index: number }> }) {
  return (
    <nav aria-label="More services">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground">More services</p>
      <ul className="mt-5">
        {siblings.map((sibling) => (
          <li key={sibling.slug}>
            <Link
              href={`/capabilities/${sibling.slug}`}
              className="group flex items-baseline gap-4 border-t border-border py-4 text-lg text-foreground transition-colors hover:text-accent md:text-base"
            >
              <span className="font-mono text-xs tabular-nums text-muted-foreground transition-colors group-hover:text-accent">
                {pad(sibling.index)}
              </span>
              <span className="text-balance">{sibling.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default async function CapabilityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const capabilities = getCapabilities()
  const capability = getCapabilityBySlug(slug)

  if (!capability) notFound()

  const index = capabilities.findIndex((item) => item.slug === slug)
  const siblings = capabilities
    .map((item, itemIndex) => ({ ...item, index: itemIndex }))
    .filter((item) => item.slug !== slug)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 pb-24 pt-28 sm:px-8 md:px-20 md:pt-32">
        <div className="mx-auto grid max-w-7xl gap-x-16 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-x-24">
          <aside className="md:sticky md:top-28 md:self-start">
            <Link
              href="/capabilities"
              className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-accent"
            >
              ← Services
            </Link>

            <p className="mt-10 font-mono text-xs tabular-nums text-muted-foreground">
              {pad(index)} <span className="text-border">/</span> {pad(capabilities.length - 1)}
            </p>

            <h1 className="mt-3 text-balance text-4xl tracking-[-0.02em] md:text-5xl">{capability.title}</h1>

            <div className="mt-14 hidden md:block">
              <SiblingNav siblings={siblings} />
            </div>
          </aside>

          <div className="mt-12 md:mt-0">
            {capability.image ? (
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <Image
                  src={capability.image}
                  alt={capability.imageAlt || capability.title}
                  fill
                  priority
                  sizes="(min-width: 768px) 60vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <p className="mt-10 max-w-[46ch] text-balance text-xl leading-8 text-foreground md:text-2xl md:leading-10">
              {capability.description}
            </p>

            {capability.body?.length ? (
              <div className="mt-10 max-w-[68ch] space-y-6 text-lg leading-8 text-muted-foreground">
                {capability.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {capability.includes?.length ? (
              <section className="mt-20">
                <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground">
                  What the work usually covers
                </h2>
                <ul className="mt-6">
                  {capability.includes.map((item, itemIndex) => (
                    <li
                      key={item}
                      className="cap-cover grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-border py-6 last:border-b"
                    >
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{pad(itemIndex)}</span>
                      <span className="max-w-[62ch] text-lg leading-8">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="mt-16 max-w-[62ch] text-lg leading-8 text-muted-foreground">
              If this is the kind of work you need,{" "}
              <Link href="/contact" className="text-foreground underline underline-offset-4 hover:text-accent">
                tell us what you are building
              </Link>
              .
            </p>

            <div className="mt-20 md:hidden">
              <SiblingNav siblings={siblings} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
