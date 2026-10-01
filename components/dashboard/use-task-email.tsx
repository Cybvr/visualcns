"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { buildEmailComposeHref, siteUrl } from "@/lib/email-composer"
import { getOrganization } from "@/lib/organizations"
import { updateTask, type Task } from "@/lib/tasks"
import { getUsersByCompanyId } from "@/lib/users"

export function useTaskEmail() {
  const router = useRouter()
  const [pendingTask, setPendingTask] = useState<Task | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)

  async function composeTaskEmail(task: Task) {
    if (emailingId) return
    setEmailingId(task.id)
    try {
      if (!task.shareEnabled && !task.isPublic) await updateTask(task.id, { shareEnabled: true })

      const [organizationResult, peopleResult] = task.companyId
        ? await Promise.allSettled([getOrganization(task.companyId), getUsersByCompanyId(task.companyId)])
        : [null, null]
      const organization = organizationResult?.status === "fulfilled" ? organizationResult.value : null
      const people = peopleResult?.status === "fulfilled" ? peopleResult.value : []
      const contact = people.find((person) => person.uid === organization?.primaryContactId && person.email)
        || people.find((person) => person.role === "client" && person.email)
      const recipientEmail = contact?.email || organization?.email || ""
      const recipientName = contact?.displayName || ""
      const title = task.name || "Untitled task"
      const greeting = recipientName.trim().split(/\s+/)[0] || "there"
      const project = task.project ? ` for ${task.project}` : ""
      const dueDate = task.dueDate ? ` It is due ${task.dueDate}.` : ""
      const taskUrl = siteUrl(`/share/tasks/${encodeURIComponent(task.id)}`)

      setPendingTask(null)
      router.push(buildEmailComposeHref({
        companyId: task.companyId,
        companyName: organization?.name || task.client,
        recipientEmail,
        recipientName,
        projectId: task.projectId,
        projectName: task.project,
        documentType: "task",
        documentId: task.id,
        documentTitle: title,
        subject: `Task: ${title}`,
        body: `Hi ${greeting},\n\nPlease review the task “${title}”${project}.${dueDate}\n\nView the task here: ${taskUrl}\n\nBest regards,`,
        messageKind: "transactional",
      }))
    } catch {
      toast.error("Couldn’t prepare this task for email. Try again.")
    } finally {
      setEmailingId(null)
    }
  }

  function emailTask(task: Task) {
    if (emailingId) return
    if (task.shareEnabled || task.isPublic) void composeTaskEmail(task)
    else setPendingTask(task)
  }

  const emailDialog = (
    <AlertDialog open={pendingTask !== null} onOpenChange={(open) => { if (!open && !emailingId) setPendingTask(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enable a view-only task link?</AlertDialogTitle>
          <AlertDialogDescription>
            To email this task, anyone with its link needs to be able to view it. You can turn off the link later in the task&apos;s Share settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={emailingId !== null}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={emailingId !== null} onClick={(event) => { event.preventDefault(); if (pendingTask) void composeTaskEmail(pendingTask) }}>
            {emailingId ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Enable link and compose
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { emailTask, emailDialog, emailingId }
}
