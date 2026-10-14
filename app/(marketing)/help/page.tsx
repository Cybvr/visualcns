import type { Metadata } from "next"
import { Suspense } from "react"

import { FaqList, GENERAL_FAQS, PRODUCT_FAQS } from "@/components/faq-list"
import { Header } from "@/components/header"
import { TemplatesSection } from "@/components/templates-section"
import { HelpChat } from "./help-chat"
import { HelpResources } from "./help-resources"
import { HelpTabs } from "./help-tabs"

export const metadata: Metadata = {
  title: "Help | VisualCNS",
  description: "Ask Ngai, read the FAQs, browse VisualCNS resources, or explore ready-made workflows.",
}

export default function HelpPage() {
  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-2 pb-4 pt-24 sm:px-6">
        <Suspense fallback={<div className="min-h-0 flex-1" role="status" aria-label="Loading help" />}>
          <HelpTabs
            chat={<HelpChat />}
            faqs={<FaqList faqs={[...PRODUCT_FAQS, ...GENERAL_FAQS]} compact />}
            resources={<HelpResources />}
            workflows={<TemplatesSection />}
          />
        </Suspense>
      </main>
    </div>
  )
}
