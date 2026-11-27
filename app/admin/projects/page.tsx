"use client"

import { useAuth } from "@/components/auth-provider"
import AdminProjectsPage from "@/components/dashboard/projects-page"
import { ClientSectionPage } from "@/components/dashboard/client-section-page"
import { CreatorCampaigns } from "@/components/dashboard/creator-campaigns"

export default function ProjectsPage() {
  const { isAdmin, isImpersonating, role } = useAuth()
  if (role === "creator") return <CreatorCampaigns />
  return isAdmin && !isImpersonating ? <AdminProjectsPage /> : <ClientSectionPage section="projects" />
}
