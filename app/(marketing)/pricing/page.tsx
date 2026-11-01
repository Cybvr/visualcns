import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import { PricingContent } from "./pricing-content"

export const metadata: Metadata = publicPageMetadata({
  title: "Pricing",
  description: "VisualCNS pricing: Growth plans with Pass, Pulse and Ngai, plus development and G&D Support.",
  path: "/pricing",
})

export default function PricingPage() {
  return <PricingContent />
}
