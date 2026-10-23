"use client"

import { useParams } from "next/navigation"

import { SharedCampaignView } from "@/components/shared-campaign"

/** No login required: one job on a campaign, with its own link. */
export default function SharedJobPage() {
  const { id = "", jobId = "" } = useParams<{ id: string; jobId: string }>()
  return <SharedCampaignView id={id} jobId={jobId} />
}
