import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PageHeading } from "@/components/page-heading"
import { TemplatesSection } from "@/components/templates-section"

export const metadata: Metadata = publicPageMetadata({
  title: "Templates",
  description: "Ready-made growth setups you can add to your agency.",
  path: "/templates",
})

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-32">
        <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-8 md:px-20">
          <PageHeading
            title="Templates"
            subtitle="Ready-made growth setups. Pick one and we set it up in your agency."
          />

          <TemplatesSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
