"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Link2, Loader2, Save, Share2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  deleteCompanyDocument,
  documentTextLength,
  updateCompanyDocument,
  type CompanyDocument,
  type CompanyDocumentKind,
  type CompanyDocumentStatus,
} from "@/lib/company-documents"
import { getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"

/**
 * The writing screen. Everything needed to bring a document into existence is
 * settled in NewDocumentDialog first, so this only ever edits one that already
 * exists — the template choice belongs to creation and isn't offered again.
 */
export function CompanyDocumentBuilder({ document: record }: { document: CompanyDocument }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [title, setTitle] = useState(record?.title ?? "")
  const [companyId] = useState(record?.companyId ?? "")
  const [projectId] = useState(record?.projectId ?? "")
  const [kind] = useState<CompanyDocumentKind>(record?.kind ?? "proposal")
  const [status] = useState<CompanyDocumentStatus>(record?.status ?? "draft")
  const [body, setBody] = useState(record?.body ?? "")
  const [shareEnabled, setShareEnabled] = useState(record?.shareEnabled ?? false)
  const [shareOpen, setShareOpen] = useState(false)

  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function saveWithShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return
      event.preventDefault()
      if (!saving) formRef.current?.requestSubmit()
    }

    window.addEventListener("keydown", saveWithShortcut)
    return () => window.removeEventListener("keydown", saveWithShortcut)
  }, [saving])

  useEffect(() => {
    let active = true
    Promise.all([getUsers(), getProjects()])
      .then(([userList, projectList]) => {
        if (!active) return
        // One entry per company, since several people share a workspace.
        const seen = new Set<string>()
        setClients(userList.filter((user) => {
          if (!user.companyId || seen.has(user.companyId)) return false
          seen.add(user.companyId)
          return true
        }))
        setProjects(projectList)
      })
      .catch(() => { if (active) setError("Couldn't load companies and projects.") })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError("Give this document a title."); return }
    if (!companyId) { setError("Choose which company this document is for."); return }
    if (documentTextLength(body) === 0) { toast.error("Write the document before saving."); return }

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
        kind,
        status,
        body,
        shareEnabled,
      }
      await updateCompanyDocument(record.id, payload)
      setSaving(false)
      toast.success("Document saved")
    } catch (saveError) {
      console.error("Error saving document:", saveError)
      setError("Couldn't save this document. Try again.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    await deleteCompanyDocument(record.id)
    router.push("/dashboard/documents")
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/dashboard/documents"
            aria-label="Back to documents"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <input
            aria-label="Document title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled document"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-semibold tracking-[-0.01em] outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Button type="button" variant="ghost" onClick={() => setShareOpen(true)}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push(`/dashboard/documents/${record.id}`)}>Cancel</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Delete document" title="Delete document" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                <AlertDialogDescription>{record.title} will be removed for good. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            type="submit"
            variant="default"
            size="icon"
            disabled={saving}
            aria-label={saving ? "Saving document" : "Save document"}
            title={saving ? "Saving document" : "Save document"}
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <RichTextEditor value={body} onChange={setBody} borderless />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share document</DialogTitle>
            <DialogDescription>Make this document available through its public link.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 py-2">
            <Label htmlFor="share-toggle" className="text-sm font-medium">Public sharing</Label>
            <Switch id="share-toggle" checked={shareEnabled} onCheckedChange={setShareEnabled} />
          </div>
          {shareEnabled && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}/share/documents/${record.id}`)
                toast.success("Link copied")
              }}
            >
              <Link2 className="size-4" aria-hidden="true" />
              Copy public link
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </form>
  )
}
