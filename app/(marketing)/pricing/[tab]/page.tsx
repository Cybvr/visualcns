import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PRICING_TABS } from "@/lib/cart"
import { publicPageMetadata } from "@/lib/public-page-metadata"
import { PricingContent } from "../pricing-content"

type Props = { params: Promise<{ tab: string }> }

export function generateStaticParams() {
  return Object.keys(PRICING_TABS).map((tab) => ({ tab }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tab } = await params
  const group = PRICING_TABS[tab]
  if (!group) return {}
  return publicPageMetadata({ title: `${group} pricing`, description: `VisualCNS ${group} pricing.`, path: `/pricing/${tab}` })
}

/** A pricing tab with its own address, e.g. /pricing/development. */
export default async function PricingTabPage({ params }: Props) {
  const { tab } = await params
  if (!PRICING_TABS[tab]) notFound()
  return <PricingContent tab={tab} />
}
