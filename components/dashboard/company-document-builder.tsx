"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronLeft, Eye, Loader2, MoreVertical, Share2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  companyDocumentKindMeta,
  companyDocumentStatusMeta,
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
  const [kind, setKind] = useState<CompanyDocumentKind>(record?.kind ?? "proposal")
  const [status, setStatus] = useState<CompanyDocumentStatus>(record?.status ?? "draft")
  const [body, setBody] = useState(record?.body ?? "")
  const [shareEnabled, setShareEnabled] = useState(record?.shareEnabled ?? false)
  const [shareOpen, setShareOpen] = useState(false)

  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const snapshot = JSON.stringify({ title, kind, status, body, shareEnabled })
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot)
  // The editor tidies the HTML once on load; count that as the saved version.
  const settled = useRef(false)
  useEffect(() => {
    if (settled.current) return
    const timer = window.setTimeout(() => { settled.current = true; setSavedSnapshot(JSON.stringify({ title, kind, status, body, shareEnabled })) }, 800)
    return () => window.clearTimeout(timer)
  })
  const dirty = snapshot !== savedSnapshot

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
      setSavedSnapshot(snapshot)
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

  const companyName = clients.find((entry) => entry.companyId === companyId)
  const projectName = projects.find((entry) => entry.id === projectId)?.title || record.project

  return (
    <form ref={formRef} onSubmit={submit} className="doc-editor sm:overflow-clip sm:rounded-2xl sm:border sm:border-border">
      <div className="sticky top-0 z-30 flex h-16 items-center gap-1 bg-background px-2 sm:px-3 [--doc-editor-top:4rem]">
        <Link
          href={`/dashboard/documents/${record.id}`}
          aria-label="Back to document"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1 px-1">
          <p className="doc-editor-bar-title truncate">{title.trim() || "Untitled document"}</p>
          <p className="doc-editor-bar-status text-muted-foreground">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share document"
          title="Share document"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 className="size-5" aria-hidden="true" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              title="More actions"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push(`/dashboard/documents/${record.id}`)}>
              <Eye aria-hidden="true" />
              <span>View document</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden="true" />
              <span>Delete document</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="submit"
          disabled={saving}
          className="doc-editor-save ml-1 h-11 shrink-0 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </div>

      <div className="[--doc-editor-top:4rem]">
        <RichTextEditor
          value={body}
          onChange={setBody}
          documentLayout
          aboveContent={
            <section className="rounded-2xl border border-border bg-background">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                aria-expanded={detailsOpen}
                className="flex w-full items-center gap-3 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="doc-editor-details-title flex-1">Document details</span>
                <span className="doc-editor-pill rounded-full bg-primary/10 px-3 py-1 text-primary">
                  {companyDocumentStatusMeta[status].label} · {companyDocumentKindMeta[kind].label}
                </span>
                <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", detailsOpen && "rotate-180")} aria-hidden="true" />
              </button>
              {detailsOpen && (
                <div className="grid gap-3 border-t border-border px-5 py-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="doc-kind" className="mb-1.5 block">Type</Label>
                    <Select value={kind} onValueChange={(value) => setKind(value as CompanyDocumentKind)}>
                      <SelectTrigger id="doc-kind" className="doc-editor-field"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(companyDocumentKindMeta).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doc-status" className="mb-1.5 block">Status</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as CompanyDocumentStatus)}>
                      <SelectTrigger id="doc-status" className="doc-editor-field"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(companyDocumentStatusMeta).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="doc-editor-meta-label">Company</p>
                    <p className="truncate text-foreground">{companyName?.company || companyName?.displayName || record.client || "—"}</p>
                  </div>
                  <div>
                    <p className="doc-editor-meta-label">Project</p>
                    <p className="truncate text-foreground">{projectName || "—"}</p>
                  </div>
                </div>
              )}
            </section>
          }
          contentHeader={
            <textarea
              aria-label="Document title"
              value={title}
              onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
              placeholder="Untitled document"
              rows={1}
              className="doc-editor-title block w-full resize-none border-0 bg-transparent px-5 pt-6 text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground sm:px-8"
            />
          }
        />
        {error && <p className="bg-card px-4 pb-4 text-sm text-destructive">{error}</p>}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
          {shareEnabled && <ShareLinkActions url={`${window.location.origin}/share/documents/${record.id}`} label="Public document link" shareText={`View ${record.title}`} />}
        </DialogContent>
      </Dialog>
    </form>
  )
}
