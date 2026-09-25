"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { ImagePlus, Loader2, Search, Upload } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { createDocument, getDocuments, uploadFileToStorage, type SharedDocument } from "@/lib/documents"
import { cn } from "@/lib/utils"

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp"

export function ImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (image: { src: string; alt: string }) => void
}) {
  const { appUser, user } = useAuth()
  const workspaceId = appUser?.companyId || user?.uid || ""
  const inputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<SharedDocument[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
      if (!open) return
      let active = true
      setLoading(true)
      setError("")
      setQuery("")
    void getDocuments()
      .then((items) => {
        if (!active) return
        setDocuments(items.filter((item) => item.type === "image" && item.url && (!item.companyId || item.companyId === workspaceId)))
      })
      .catch(() => {
        if (active) setError("The Drive images could not be loaded.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [open, workspaceId])

  const visibleDocuments = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value ? documents.filter((item) => item.title.toLowerCase().includes(value)) : documents
  }, [documents, query])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const source = event.target.files?.[0]
    event.target.value = ""
    if (!source) return
    setError("")
    setUploading(true)
    try {
      const url = await uploadFileToStorage(source)
      const id = await createDocument({
        title: source.name.replace(/\.[^.]+$/, "") || "Email image",
        url,
        description: "Email media",
        companyId: workspaceId,
        sharedWith: "Private",
        sharedWithUserIds: [],
        type: "image",
        thumbnailUrl: url,
      })
      const document: SharedDocument = {
        id,
        title: source.name.replace(/\.[^.]+$/, "") || "Email image",
        url,
        description: "Email media",
        companyId: workspaceId,
        sharedWith: "Private",
        sharedWithUserIds: [],
        type: "image",
        thumbnailUrl: url,
      }
      setDocuments((current) => [document, ...current])
      onSelect({ src: url, alt: document.title })
      onOpenChange(false)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>Choose an image</DialogTitle>
          <DialogDescription>
            Select an existing Drive image or upload one. Uploads are resized to a 1600px maximum edge and compressed below 1.75 MB.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Drive images" aria-label="Search Drive images" className="pl-9" />
          </div>
          <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} onChange={handleUpload} className="hidden" />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? "Uploading" : "Upload image"}
          </Button>
        </div>
        <div className="max-h-[min(60vh,32rem)] min-h-48 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="status" aria-label="Loading Drive images">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />)}</div>
          ) : visibleDocuments.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">{query ? "No matching images" : "No Drive images yet"}</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Upload an image here and it will also appear in the Drive page for reuse.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  aria-label={`Use ${document.title}`}
                  onClick={() => { onSelect({ src: document.url, alt: document.title }); onOpenChange(false) }}
                  className="group overflow-hidden rounded-[10px] border border-border bg-card text-left outline-none transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={document.thumbnailUrl || document.url} alt="" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                  </div>
                  <span className={cn("block truncate px-2.5 py-2 text-xs font-medium", document.title && "text-foreground")}>{document.title}</span>
                </button>
              ))}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
