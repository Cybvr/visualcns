import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import { RateCardContent } from "./rate-card-content"

export const metadata: Metadata = publicPageMetadata({
  title: "VisualHQ Rate Card",
  description: "VisualHQ rate card.",
  path: "/ratecard",
})

export default function RateCardPage() {
  return <RateCardContent />
}
