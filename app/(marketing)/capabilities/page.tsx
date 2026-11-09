import { CapabilitiesIndex } from "@/components/capabilities-index"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getCapabilities } from "@/lib/capabilities"

export default function CapabilitiesPage() {
  const capabilities = getCapabilities()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 pb-24 pt-28 sm:px-8 md:px-20 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <h1 className="max-w-4xl text-balance text-5xl tracking-[-0.02em] md:text-7xl">
            Services VisualCNS brings to <span className="text-primary">market</span>.
          </h1>

          <CapabilitiesIndex capabilities={capabilities} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
