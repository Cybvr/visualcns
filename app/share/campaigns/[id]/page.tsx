"use client"

import { Suspense, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { SharedCampaignView } from "@/components/shared-campaign"
import { campaignSharePath } from "@/lib/campaign-brief"

/** The campaign's own link: every job on it. Older ?role= links move to that job's page. */
export default function SharedCampaignPage() {
  return <Suspense><SharedCampaign /></Suspense>
}

function SharedCampaign() {
  const { id = "" } = useParams<{ id: string }>()
  const role = useSearchParams().get("role") ?? ""
  const router = useRouter()
  useEffect(() => { if (role) router.replace(campaignSharePath(id, role)) }, [id, role, router])
  if (role) return null
  return <SharedCampaignView id={id} />
}
