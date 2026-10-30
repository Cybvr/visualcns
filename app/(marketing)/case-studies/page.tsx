import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { PortfolioSection } from "@/components/portfolio-section"

export const metadata: Metadata = publicPageMetadata({
  title: "Case Studies | VisualCNS",
  description: "Selected VisualCNS client projects across brand, product, and platform work.",
  path: "/case-studies",
})

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <PortfolioSection />

      <section className="bg-foreground px-4 py-16 text-primary-foreground sm:px-8 md:px-20 md:py-20">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl tracking-tight md:text-4xl">Have a project in mind?</h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/70">
            We'd love to hear about it. Let's discuss how we can help bring your vision to life.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <a href="/contact">Start a Project</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
