import type { Metadata } from "next"
import type { ReactNode } from "react"

import { sharedCampaignMetadata } from "@/lib/server/page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return sharedCampaignMetadata(id)
}

export default function SharedCampaignLayout({ children }: { children: ReactNode }) {
  return children
}
