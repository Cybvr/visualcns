"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { DangerZone } from "@/components/dashboard/danger-zone"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  contractStatusMeta,
  createContract,
  deleteContract,
  updateContract,
  type Contract,
  type ContractStatus,
} from "@/lib/billing"
import { getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { cn } from "@/lib/utils"

export function ContractBuilder({ contract, initialCompanyId }: { contract?: Contract | null; initialCompanyId?: string }) {
  const router = useRouter()
  const isEdit = Boolean(contract)

  const [title, setTitle] = useState(contract?.title ?? "")
  const [companyId, setCompanyId] = useState(contract?.companyId ?? initialCompanyId ?? "")
  const [projectId, setProjectId] = useState(contract?.projectId ?? "")
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? "draft")
  const [startsOn, setStartsOn] = useState(contract?.startsOn ?? "")
  const [endsOn, setEndsOn] = useState(contract?.endsOn ?? "")
  const [signedOn, setSignedOn] = useState(contract?.signedOn ?? "")

  // The agreement is either written here or kept somewhere else and linked.
  const [mode, setMode] = useState<"write" | "link">(
    contract && !contract.body && contract.url ? "link" : "write",
  )
  const [body, setBody] = useState(contract?.body ?? "")
  const [url, setUrl] = useState(contract?.url ?? "")

  const [shareEnabled, setShareEnabled] = useState(contract?.shareEnabled ?? false)

  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getUsers(), getProjects()])
      .then(([userList, projectList]) => {
        if (!active) return
        // Several people can share a workspace, so this is narrowed to one
        // entry per companyId - otherwise the same company lists twice (and
        // the duplicate companyId shows up as a duplicate React key).
        const seenWorkspaces = new Set<string>()
        setClients(
          userList.filter((user) => {
            if (!user.companyId || seenWorkspaces.has(user.companyId)) return false
            seenWorkspaces.add(user.companyId)
            return true
          }),
        )
        setProjects(projectList)
      })
      .catch(() => {
        if (active) setError("Couldn't load clients and projects.")
      })
      .finally(() => {
        if (active) setOptionsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError("Give this contract a title.")
      return
    }
    if (!companyId) {
      setError("Choose which client this contract is for.")
      return
    }

    const linked = mode === "link"
    if (linked && !url.trim()) {
      setError("Paste the link to the contract.")
      return
    }
    // An empty editor still returns a paragraph tag, so check the text.
    const written = body.replace(/<[^>]*>/g, "").trim()
    if (!linked && !written) {
      toast.error("Write the agreement, or switch to Link.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const client = clients.find((entry) => entry.companyId === companyId)
      const project = projects.find((entry) => entry.id === projectId)

      const payload = {
        title: trimmedTitle,
        companyId,
        client: client?.company || client?.displayName || "",
        projectId: projectId || "",
        project: project?.title || "",
        status,
        body: linked ? "" : body,
        url: linked ? url.trim() : "",
        startsOn,
        endsOn,
        // A signature date only means anything once it has actually been signed.
        signedOn: status === "signed" ? signedOn : "",
        shareEnabled,
      }

      if (contract) await updateContract(contract.id, payload)
      else await createContract(payload)

      router.push("/dashboard/contracts")
    } catch (err) {
      console.error("Error saving contract:", err)
      setError("Couldn't save this contract. Try again.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!contract) return
    await deleteContract(contract.id)
    router.push("/dashboard/contracts")
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/contracts"
          aria-label="Back to contracts"
          className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-[-0.01em]">
          {title.trim() || (isEdit ? "Edit contract" : "New contract")}
        </h1>
        <Button type="submit" size="sm" disabled={saving} className="shrink-0">
          {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </div>

      <ShareLinkField
        enabled={shareEnabled}
        onEnabledChange={setShareEnabled}
        path={contract ? `/share/contracts/${contract.id}` : undefined}
      />

      <div className="space-y-8 sm:rounded-[14px] sm:border sm:border-border sm:bg-card sm:p-6">
        <section className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Master services agreement"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="client">Client</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="client" className="mt-1">
                  <SelectValue placeholder={optionsLoading ? "Loading..." : "Choose a client"} />
                </SelectTrigger>
                <SelectContent>
                  {[...clients].sort((a, b) => (a.company || a.displayName || a.email || "").localeCompare(b.company || b.displayName || b.email || "", undefined, { sensitivity: "base" })).map((client) => (
                    <SelectItem key={client.uid} value={client.companyId as string}>
                      {client.company || client.displayName || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project" className="mt-1">
                  <SelectValue placeholder="Not tied to a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((project) => !companyId || project.companyId === companyId)
                    .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }))
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="starts-on">Starts</Label>
                <Input
                  id="starts-on"
                  type="date"
                  value={startsOn}
                  onChange={(event) => setStartsOn(event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ends-on">Ends</Label>
                <Input
                  id="ends-on"
                  type="date"
                  value={endsOn}
                  onChange={(event) => setEndsOn(event.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ContractStatus)}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(contractStatusMeta).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status === "signed" && (
              <div>
                <Label htmlFor="signed-on">Signed</Label>
                <Input
                  id="signed-on"
                  type="date"
                  value={signedOn}
                  onChange={(event) => setSignedOn(event.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-medium">Agreement</h2>
          <div className="inline-flex rounded-[8px] bg-muted p-0.5">
            {(
              [
                { value: "write", label: "Write" },
                { value: "link", label: "Link" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={mode === option.value}
                className={cn(
                  "rounded-[6px] px-3 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  mode === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "link" ? (
          <div>
            <Label htmlFor="contract-url">Contract link</Label>
            <Input
              id="contract-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="mt-1"
            />
          </div>
        ) : (
          <RichTextEditor value={body} onChange={setBody} />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {isEdit && contract && (
        <DangerZone
          label="contract"
          confirmTitle="Delete this contract?"
          confirmDescription={`${contract.title} will be removed for good. This cannot be undone.`}
          onDelete={handleDelete}
        />
      )}
    </form>
  )
}
