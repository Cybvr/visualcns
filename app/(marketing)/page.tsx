import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { BookNowModal } from "@/components/book-now-modal"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PwaRedirect } from "@/components/pwa-redirect"
import { HomeSections } from "@/components/home-sections"
import { HomeLogoCarousel } from "@/components/home-logo-carousel"
import { getBrandItems } from "@/lib/brands"
import { getCapabilities } from "@/lib/capabilities"
import { getBlogPosts } from "@/lib/blog"

import "./home.css"

const capabilities = getCapabilities()
const products = getBrandItems().filter((b) => b.slug !== "visualhq")
const news = getBlogPosts()

export default function HomePage() {
  return (
    <PwaRedirect>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="pt-28 sm:pt-32 md:pt-36">
        {/* Hero: the tagline is the page, not a caption on a video. */}
        <section aria-labelledby="home-hero-heading" className="mx-auto max-w-7xl px-4 sm:px-8 md:px-20">
          <p className="home-rise font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground md:text-sm">
            Creative consultancy &amp; software studio — Lagos
          </p>
          <h1
            id="home-hero-heading"
            className="home-rise home-rise-2 mt-6 text-[clamp(3.25rem,15vw,12rem)] font-medium leading-[0.82] tracking-[-0.04em] text-foreground"
          >
            Dream.
            <br />
            <span className="italic text-accent" style={{ fontFamily: "var(--font-serif)" }}>
              Execute
            </span>
            .
          </h1>
          <div className="home-rise home-rise-3 mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
              A global creative consultancy building digital experiences, brand systems, and technology products for
              modern businesses.
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <BookNowModal triggerLabel="Start a project" triggerClassName="rounded-full" />
              <Link
                href="/case-studies"
                className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:text-accent"
              >
                See the work
                <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </div>
        </section>

        {/* Full-bleed Lagos film. Breaks the container edge-to-edge for scale. */}
        <section aria-label="Lagos" className="home-rise home-rise-4 mt-14 md:mt-20">
          <div className="relative aspect-[16/9] max-h-[42rem] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
            <video
              className="size-full object-cover"
              src="/herov2.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Lagos video"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden="true" />
            <span className="absolute bottom-5 left-4 font-mono text-xs uppercase tracking-[0.24em] text-white/90 sm:left-8 md:bottom-8 md:left-20">
              Lagos, Nigeria → Worldwide
            </span>
          </div>
        </section>

        <div className="mt-10 md:mt-14">
          <HomeLogoCarousel />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-8 md:px-20">
          <HomeSections products={products} capabilities={capabilities} news={news} />
        </div>
        </main>
        <Footer />
      </div>
    </PwaRedirect>
  )
}
