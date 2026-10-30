import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import { PricingContent } from "./pricing-content"

export const metadata: Metadata = publicPageMetadata({
  title: "Pricing",
  description: "Three VisualCNS plans, monthly or yearly: Pass visitor sign-in, Pulse, Ngai and growth workflows.",
  path: "/pricing",
})

export default function PricingPage() {
  return <PricingContent />
}
