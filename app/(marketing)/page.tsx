import { publicPageMetadata } from "@/lib/public-page-metadata"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PwaRedirect } from "@/components/pwa-redirect"
import { HomePricing } from "@/components/home-pricing"
import { HomeSections } from "@/components/home-sections"
import { HomeLogoCarousel } from "@/components/home-logo-carousel"
import { getCapabilities } from "@/lib/capabilities"
import { getBlogPosts } from "@/lib/blog"

import "./home.css"

export const metadata = publicPageMetadata({
  title: "VisualCNS - Bring Your Ideas To Life",
  description: "VisualCNS builds software systems, product businesses, and AI-enabled tools from Lagos for modern teams.",
  path: "/",
})

const capabilities = getCapabilities()
const news = getBlogPosts()

export default function HomePage() {
  return (
    <PwaRedirect>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main>
        {/* Hero: the video fills the section behind a dark overlay, with the headline and calls to action on top. */}
        <section aria-labelledby="home-hero-heading" className="relative isolate flex min-h-[85svh] items-end overflow-hidden bg-black pb-16 pt-44 text-white md:min-h-[90svh] md:pb-24">
          <video
            className="absolute inset-0 -z-20 size-full object-cover"
            src="/herov2.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/60 to-black/45" aria-hidden="true" />
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-20">
            <h1
              id="home-hero-heading"
              className="home-rise home-rise-2 max-w-4xl text-[clamp(2.25rem,8vw,5.5rem)] font-medium leading-none tracking-[-0.04em]"
            >
              Dream. <span className="text-primary">Execute</span>.
            </h1>
            <div className="home-rise home-rise-3 mt-5 flex flex-col gap-6 md:mt-6 md:flex-row md:items-end md:justify-between">
              <p className="max-w-lg text-base text-white/80 md:text-lg">
                Business Growth software for modern brands.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/pricing">Get started</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/70 dark:bg-transparent dark:hover:bg-white/10">
                  <Link href="/contact">Book a call</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 md:mt-14">
          <HomeLogoCarousel />
        </div>

        <HomePricing />

        <HomeSections capabilities={capabilities} news={news} />
        </main>
        <Footer />
      </div>
    </PwaRedirect>
  )
}
