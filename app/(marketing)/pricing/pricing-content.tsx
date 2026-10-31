import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PageHeading } from "@/components/page-heading"
import { PricingView } from "@/components/pricing-view"

export function PricingContent() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-32">
        <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-8 md:px-20">
          <PageHeading title="Pricing" subtitle="Growth plans, development and maintenance. Add what you need to your cart." />

          <PricingView cartHref="/cart" freeHref="/signup" />
        </div>
      </main>
      <Footer />
    </div>
  )
}
