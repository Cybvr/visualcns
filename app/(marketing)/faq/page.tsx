import type { Metadata } from "next"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { FaqList, GENERAL_FAQS } from "@/components/faq-list"

export const metadata: Metadata = {
  title: "FAQ | VisualCNS",
  description: "Answers to common questions about VisualCNS, our services, and how we work.",
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 pb-24 pt-32 sm:px-8 md:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-balance text-5xl tracking-[-0.03em] md:text-7xl">Frequently Asked Questions</h1>
          </div>

          <FaqList faqs={GENERAL_FAQS} className="mt-20 max-w-5xl" />
        </div>
      </main>
      <Footer />
    </div>
  )
}
