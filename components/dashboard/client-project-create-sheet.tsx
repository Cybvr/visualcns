"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createProject } from "@/lib/projects"

export function ClientProjectCreateSheet({
  open,
  companyId,
  clientName,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  companyId: string
  clientName: string
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [service, setService] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setService("")
    setDueDate("")
    setError(null)
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const projectTitle = title.trim()

    if (!companyId) {
      setError("This account is not connected to a company yet.")
      return
    }
    if (!projectTitle) {
      setError("Add a project name before creating it.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createProject({
        companyId,
      client: clientName || "Client company",
        title: projectTitle,
        service: service.trim(),
        status: "in-progress",
        progress: 0,
        dueDate,
      })
      await onCreated()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The project could not be created. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>New project</SheetTitle>
          <SheetDescription>Name it and set a due date. You can add tasks once it exists.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="client-project-title">Project name</Label>
            <Input
              id="client-project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Website redesign"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-project-service">Service</Label>
            <Input
              id="client-project-service"
              value={service}
              onChange={(event) => setService(event.target.value)}
              maxLength={120}
              placeholder="Design, development, strategy..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-project-due-date">Due date</Label>
            <Input
              id="client-project-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          {error && <p className="text-sm leading-6 text-destructive" role="alert">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              {saving ? "Creating" : "Create project"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
