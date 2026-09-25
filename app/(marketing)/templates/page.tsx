import type { Metadata } from "next"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PageHeading } from "@/components/page-heading"
import { TemplatesSection } from "@/components/templates-section"

export const metadata: Metadata = {
  title: "Templates",
  description: "Ready-made workflows you can set up in your agency.",
}

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 pt-32">
        <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-8 md:px-20">
          <PageHeading
            title="Templates"
            subtitle="Ready-made workflows. Pick one and we set it up in your agency."
          />

          <TemplatesSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
