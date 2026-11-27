"use client"

import { MarketingSocialPanel } from "@/components/company/sections/marketing-flow"
import { SocialOverview } from "@/components/company/social-overview"

/** The company's social media: who to warm up and this month's posts from Marketing, then account performance and posts. */
export function SocialSection() {
  return (
    <div className="mt-5 min-w-0 space-y-8">
      <MarketingSocialPanel />
      <SocialOverview />
    </div>
  )
}
