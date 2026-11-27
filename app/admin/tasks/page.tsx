"use client"

import { useAuth } from "@/components/auth-provider"
import AdminTasksPage from "@/components/dashboard/tasks-page"
import { ClientSectionPage } from "@/components/dashboard/client-section-page"

export default function TasksPage() {
  const { isAdmin, isImpersonating } = useAuth()
  return isAdmin && !isImpersonating ? <AdminTasksPage /> : <ClientSectionPage section="tasks" />
}
