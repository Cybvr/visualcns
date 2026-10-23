"use client"

import { useParams } from "next/navigation"

import { SharedCampaignApply } from "@/components/shared-campaign-apply"

/** No login required: where a job's Apply button goes. */
export default function SharedJobApplyPage() {
  const { id = "", jobId = "" } = useParams<{ id: string; jobId: string }>()
  return <SharedCampaignApply id={id} jobId={jobId} />
}
