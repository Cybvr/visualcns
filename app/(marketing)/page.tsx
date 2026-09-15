import { BookNowModal } from "@/components/book-now-modal"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
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
      <Header />
      <main className="pt-28 sm:pt-32 md:pt-36">
        <section aria-labelledby="home-hero-heading" className="mx-auto max-w-7xl px-4 sm:px-8 md:px-20">
          <h1
            id="home-hero-heading"
            className="mb-8 text-center text-5xl leading-[0.9] tracking-[-0.03em] text-foreground sm:mb-10 sm:text-6xl md:text-8xl"
          >
            Dream. Execute
          </h1>
          <div className="h-[58svh] min-h-[22rem] max-h-[48rem] overflow-hidden rounded-[0.75rem] bg-muted">
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
          </div>
          <div className="mt-8 flex justify-center sm:mt-10">
            <BookNowModal />
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
