import type { Metadata } from "next"
import { PricingContent } from "./pricing-content"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Three VisualCNS plans, monthly or yearly: Pass visitor sign-in, Pulse, Ngai and growth workflows.",
}

export default function PricingPage() {
  return <PricingContent />
}
