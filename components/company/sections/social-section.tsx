"use client"

import { SocialOverview } from "@/components/company/social-overview"

/** The company's social media: account performance and posts. Accounts are connected in Marketing Settings. */
export function SocialSection() {
  return (
    <div className="mt-5 min-w-0">
      <SocialOverview />
    </div>
  )
}
