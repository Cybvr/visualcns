import { publicPageMetadata } from "@/lib/public-page-metadata"

import { BookNowModal } from "@/components/book-now-modal"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PwaRedirect } from "@/components/pwa-redirect"
import { HomePricing } from "@/components/home-pricing"
import { HomeSections } from "@/components/home-sections"
import { HomeLogoCarousel } from "@/components/home-logo-carousel"
import { getBrandItems } from "@/lib/brands"
import { getCapabilities } from "@/lib/capabilities"
import { getBlogPosts } from "@/lib/blog"

import "./home.css"

export const metadata = publicPageMetadata({
  title: "VisualCNS - Bring Your Ideas To Life",
  description: "VisualCNS builds software systems, product businesses, and AI-enabled tools from Lagos for modern teams.",
  path: "/",
})

const capabilities = getCapabilities()
const products = getBrandItems().filter((b) => b.slug !== "visualhq")
const news = getBlogPosts()

export default function HomePage() {
  return (
    <PwaRedirect>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main>
        {/* Hero: headline, call to action and video on the brand color. */}
        <section aria-labelledby="home-hero-heading" className="bg-primary pb-14 pt-44 text-primary-foreground sm:pt-40 md:pb-20 md:pt-44">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 md:px-20">
            <h1
              id="home-hero-heading"
              className="home-rise home-rise-2 max-w-4xl text-[clamp(2.25rem,8vw,5.5rem)] font-medium leading-none tracking-[-0.04em]"
            >
              Business Growth software for modern brands.
            </h1>
            <div className="home-rise home-rise-3 mt-5 flex flex-col gap-6 md:mt-6 md:flex-row md:items-end md:justify-between">
              <p className="max-w-lg text-base text-primary-foreground/80 md:text-lg">
                VisualCNS is a creative innovation, branding, and digital design agency for modern business.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <BookNowModal
                  triggerLabel="Start trial"
                  triggerClassName="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                />
              </div>
            </div>
            <div className="home-rise home-rise-4 relative mt-10 aspect-[16/9] max-h-[42rem] w-full overflow-hidden rounded-3xl bg-black/20 sm:aspect-[21/9] md:mt-14">
              <video
                className="size-full object-cover"
                src="/herov2.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="VisualCNS showreel"
              />
            </div>
          </div>
        </section>

        <HomePricing />

        <div className="mt-4 md:mt-6">
          <HomeLogoCarousel />
        </div>

        <HomeSections products={products} capabilities={capabilities} news={news} />
        </main>
        <Footer />
      </div>
    </PwaRedirect>
  )
}
