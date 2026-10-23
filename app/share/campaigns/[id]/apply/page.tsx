"use client"

import { Suspense, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { SharedCampaignApply } from "@/components/shared-campaign-apply"
import { campaignSharePath } from "@/lib/campaign-brief"

/** Applying to post on the campaign. Older ?role= links move to that job's apply page. */
export default function SharedCampaignApplyPage() {
  return <Suspense><SharedApply /></Suspense>
}

function SharedApply() {
  const { id = "" } = useParams<{ id: string }>()
  const role = useSearchParams().get("role") ?? ""
  const router = useRouter()
  useEffect(() => { if (role) router.replace(`${campaignSharePath(id, role)}/apply`) }, [id, role, router])
  if (role) return null
  return <SharedCampaignApply id={id} />
}
