"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useOptionalCompanyPage } from "@/components/company/company-page-context"
import { useSubscription } from "@/components/company/company-plan"
import { UpgradeModal } from "@/components/company/upgrade-modal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { watchCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import type { Project } from "@/lib/projects"
import type { Task } from "@/lib/tasks"

/** Stable, so the memo below doesn't rerun every render when there is no task list. */
const EMPTY_TASKS: Task[] = []

type PartKey = "angle" | "strategy" | "announcement" | "hooks" | "rosterTarget" | "creatorSuggestions" | "tasks"
type Step = "idle" | "queued" | "working" | "done" | "failed"

const PARTS: { key: PartKey; label: string }[] = [
  { key: "angle", label: "Narrative and angle" },
  { key: "strategy", label: "Strategy" },
  { key: "announcement", label: "Announcement post" },
  { key: "hooks", label: "Hooks" },
  { key: "rosterTarget", label: "Creator target" },
  { key: "creatorSuggestions", label: "Creator research" },
  { key: "tasks", label: "Tasks" },
]

/**
 * Ngai fills in the campaign from its About. Parts already written start
 * unticked, and it works down the list one part at a time. Clients without an
 * active plan get the upgrade window instead.
 */
export function CampaignGenerateButton({ project, companyName, onPatched, open: controlledOpen, onOpenChange, hideTrigger = false }: { project: Project; companyName: string; onPatched?: (patch: Partial<Project>) => void; open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean }) {
  const { user } = useAuth()
  // Outside a company page (the dashboard campaign page) there is no shared task list, so start from none.
  const tasks = useOptionalCompanyPage()?.tasks ?? EMPTY_TASKS
  const billing = useSubscription(project.companyId)
  const [internalOpen, setInternalOpen] = useState(false)
  const [posts, setPosts] = useState<CampaignCreative[]>([])
  const [steps, setSteps] = useState<Partial<Record<PartKey, Step>>>({})
  const [running, setRunning] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const hasAbout = Boolean(project.about?.trim())
  const open = controlledOpen ?? internalOpen

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => (open ? watchCampaignCreatives(project.id, setPosts, () => setPosts([])) : undefined), [open, project.id])

  const written = useMemo<Record<PartKey, boolean>>(() => {
    const textPosts = posts.filter((post) => post.type === "text")
    return {
      angle: Boolean(project.angle?.trim()),
      strategy: Boolean(project.description?.trim()),
      announcement: textPosts.some((post) => /announcement/i.test(post.title) && post.body?.trim()),
      hooks: textPosts.some((post) => /^hook\b/i.test(post.title)),
      rosterTarget: Boolean(project.rosterTarget?.trim()),
      creatorSuggestions: Boolean(project.creatorSuggestions?.some((handle) => handle.trim().startsWith("@"))),
      tasks: tasks.some((task) => task.projectId === project.id),
    }
  }, [posts, project, tasks])

  function openDialog() {
    setSteps({})
    setOpen(true)
  }

  // Ngai writes whatever is still missing, or everything again once it's all written.
  const missing = PARTS.filter((part) => !written[part.key]).map((part) => part.key)
  const queueKeys = missing.length ? missing : PARTS.map((part) => part.key)

  async function run() {
    if (!user || running) return
    const queue = queueKeys
    setRunning(true)
    setSteps(Object.fromEntries(queue.map((key) => [key, "queued"])))
    for (const key of queue) {
      setSteps((current) => ({ ...current, [key]: "working" }))
      try {
        const response = await fetch("/api/campaigns/generate", {
          method: "POST",
          headers: { Authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json" },
          body: JSON.stringify({ projectId: project.id, parts: [key] }),
        })
        const body = await response.json().catch(() => ({}))
        if (body.upgrade) {
          setRunning(false)
          setOpen(false)
          setUpgradeOpen(true)
          return
        }
        if (!response.ok) throw new Error(body.error)
        if (body.patch && Object.keys(body.patch).length) onPatched?.(body.patch)
        setSteps((current) => ({ ...current, [key]: "done" }))
      } catch (error) {
        setSteps((current) => ({ ...current, [key]: "failed" }))
        toast.error(error instanceof Error && error.message ? error.message : "Ngai couldn't finish this part.")
      }
    }
    setRunning(false)
  }

  const finished = !running && Object.keys(steps).length > 0

  return (
    <>
      {!hideTrigger && (
        <Button type="button" variant="ghost" onClick={openDialog}>
          <Image src="/ngai-logo.png" alt="" width={16} height={16} className="rounded-full" />
          <span className="underline underline-offset-4">Build with Ngai</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!running) setOpen(next) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Build with Ngai</DialogTitle>
            <DialogDescription className="sr-only">Ngai writes what the campaign is missing.</DialogDescription>
          </DialogHeader>
          {!hasAbout && <p className="text-sm text-muted-foreground">Write About the event in Brief first.</p>}
          <div className="space-y-2.5">
            {PARTS.map((part) => {
              const step = steps[part.key] ?? (written[part.key] && missing.length ? "done" : undefined)
              return (
                <div key={part.key} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {step === "working" ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Writing" />
                      : step === "done" ? <Check className="size-4" aria-label="Done" />
                      : step === "failed" ? <X className="size-4 text-destructive" aria-label="Didn't work" />
                      : <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />}
                  </span>
                  <span className={step === "done" && !steps[part.key] ? "text-muted-foreground" : undefined}>{part.label}</span>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            {finished ? (
              <Button type="button" onClick={() => setOpen(false)}>Close</Button>
            ) : (
              <Button type="button" onClick={() => void run()} disabled={running || !hasAbout}>
                {running ? "Building…" : missing.length ? "Build" : "Rebuild all"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} companyId={project.companyId} companyName={companyName} billing={billing} />
    </>
  )
}
