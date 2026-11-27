"use client"

import { useMarketingLeads } from "@/components/company/sections/marketing-flow"
import { SocialOverview } from "@/components/company/social-overview"

/** Posts: account performance, then every post, Marketing's included. */
export function SocialSection() {
  // Loading Marketing copies its posts into this list.
  useMarketingLeads()
  return (
    <div className="mt-5 min-w-0 space-y-8">
      <SocialOverview />
    </div>
  )
}
