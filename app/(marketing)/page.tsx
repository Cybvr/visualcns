import { BookNowModal } from "@/components/book-now-modal"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PwaRedirect } from "@/components/pwa-redirect"
import { HomeAccordion } from "@/components/home-accordion"
import { getBrandItems } from "@/lib/brands"
import { getCapabilities } from "@/lib/capabilities"
import { getBlogPosts } from "@/lib/blog"

const capabilities = getCapabilities()
const products = getBrandItems().filter((b) => b.slug !== "visualhq")
const news = getBlogPosts()

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PwaRedirect />
      <Header />
      <main className="pt-28 sm:pt-32 md:pt-36">
        <section aria-labelledby="home-hero-heading" className="mx-auto max-w-7xl px-4 sm:px-8 md:px-20">
          <div className="relative h-[58svh] min-h-[22rem] max-h-[48rem] overflow-hidden rounded-[0.75rem] bg-muted">
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
            {/* Scrim keeps the heading and CTA legible over the video. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 flex max-w-full flex-col items-end gap-4 p-6 text-right sm:p-8 md:p-10">
              <h1
                id="home-hero-heading"
                className="text-4xl leading-[0.9] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl"
              >
                Dream. Execute
              </h1>
              <BookNowModal />
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-8 md:px-20 md:pt-16">
          <HomeAccordion products={products} capabilities={capabilities} news={news} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
