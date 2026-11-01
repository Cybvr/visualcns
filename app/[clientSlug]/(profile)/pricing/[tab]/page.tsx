import { notFound } from "next/navigation"

import { PRICING_TABS } from "@/lib/cart"
import { CompanyPricing } from "../company-pricing"

/** A company's pricing tab with its own address, e.g. /acme/pricing/development. */
export default async function CompanyPricingTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params
  if (!PRICING_TABS[tab]) notFound()
  return <CompanyPricing tab={tab} />
}
