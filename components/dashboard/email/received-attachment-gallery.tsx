"use client"

import { useEffect, useState } from "react"
import { Download, Eye, File, FileText, Image as ImageIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ReceivedAttachment, ReceivedMessage } from "./types"

type Props = {
  message: ReceivedMessage
  onDownload: (message: ReceivedMessage, file: ReceivedAttachment) => void
  downloadingAttachmentId: string | null
}

function isImage(file: ReceivedAttachment) {
  return /^image\/(?:png|jpe?g|gif|webp|avif|bmp)$/i.test(file.contentType)
}

function isPdf(file: ReceivedAttachment) {
  return file.contentType.toLowerCase() === "application/pdf"
}

function fileSize(size: number) {
  if (!size) return ""
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function attachmentBlob(messageId: string, file: ReceivedAttachment, token: string, signal: AbortSignal) {
  const params = new URLSearchParams({ id: messageId, attachment: file.id, filename: file.filename, type: file.contentType })
  const response = await fetch(`/api/email/received?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  })
  if (!response.ok) throw new Error("This attachment could not be opened.")
  return response.blob()
}

export function ReceivedAttachmentGallery({ message, onDownload, downloadingAttachmentId }: Props) {
  const { user } = useAuth()
  const files = message.attachments || []
  const attachmentIds = files.map((file) => file.id).join("|")
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [thumbnailsLoading, setThumbnailsLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<ReceivedAttachment | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const urls: string[] = []
    setThumbnails({})
    setThumbnailsLoading(true)

    async function loadThumbnails() {
      const images = (message.attachments || []).filter(isImage)
      if (!user || images.length === 0) {
        setThumbnailsLoading(false)
        return
      }
      try {
        const token = await user.getIdToken()
        for (let offset = 0; offset < images.length; offset += 4) {
          const batch = await Promise.all(images.slice(offset, offset + 4).map(async (file) => {
            try {
              const blob = await attachmentBlob(message.id, file, token, controller.signal)
              if (controller.signal.aborted) return null
              const url = URL.createObjectURL(blob)
              urls.push(url)
              return [file.id, url] as const
            } catch {
              return null
            }
          }))
          if (controller.signal.aborted) return
          setThumbnails((current) => ({ ...current, ...Object.fromEntries(batch.filter((item) => item !== null)) }))
        }
      } catch { /* The cards still offer downloads if preview loading fails. */ }
      if (!controller.signal.aborted) setThumbnailsLoading(false)
    }

    void loadThumbnails()
    return () => {
      controller.abort()
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [message.id, attachmentIds, user])

  useEffect(() => {
    if (!previewFile || !isPdf(previewFile)) {
      setPdfPreviewUrl(null)
      setPreviewError("")
      return
    }
    const controller = new AbortController()
    let url: string | null = null
    setPdfPreviewUrl(null)
    setPreviewError("")

    async function loadPdf() {
      if (!user || !previewFile) return
      try {
        const token = await user.getIdToken()
        const blob = await attachmentBlob(message.id, previewFile, token, controller.signal)
        if (controller.signal.aborted) return
        url = URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
      } catch {
        if (!controller.signal.aborted) setPreviewError("The preview could not be loaded. You can still download the file.")
      }
    }

    void loadPdf()
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [message.id, previewFile, user])

  if (files.length === 0) return null

  const imagePreviewUrl = previewFile ? thumbnails[previewFile.id] : null
  const previewUrl = previewFile && isPdf(previewFile) ? pdfPreviewUrl : imagePreviewUrl

  return (
    <section className="border-t border-border bg-background px-4 py-5 sm:px-6" aria-label="Email attachments">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{files.length} {files.length === 1 ? "attachment" : "attachments"}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {files.map((file) => {
          const canPreview = isImage(file) || isPdf(file)
          const thumbnail = thumbnails[file.id]
          return (
            <div key={file.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => canPreview ? setPreviewFile(file) : onDownload(message, file)}
                className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label={`${canPreview ? "Preview" : "Download"} ${file.filename}`}
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/50">
                  {thumbnail ? <img src={thumbnail} alt="" className="size-full object-cover" /> : isImage(file) ? <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" /> : isPdf(file) ? <FileText className="size-8 text-muted-foreground" aria-hidden="true" /> : <File className="size-8 text-muted-foreground" aria-hidden="true" />}
                </div>
                <p className="truncate px-3 pt-2 text-xs font-medium" title={file.filename}>{file.filename}</p>
              </button>
              <div className="flex min-h-9 items-center justify-between gap-1 px-2 pb-1 pl-3">
                <span className="truncate text-[11px] text-muted-foreground">{fileSize(file.size) || (isImage(file) ? "Image" : isPdf(file) ? "PDF" : "File")}</span>
                <div className="flex shrink-0 items-center">
                  {canPreview && <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setPreviewFile(file)} aria-label={`Preview ${file.filename}`} title="Preview"><Eye className="size-4" aria-hidden="true" /></Button>}
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onDownload(message, file)} disabled={downloadingAttachmentId === file.id} aria-label={`Download ${file.filename}`} title="Download"><Download className="size-4" aria-hidden="true" /></Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Dialog open={Boolean(previewFile)} onOpenChange={(open) => { if (!open) setPreviewFile(null) }}>
        <DialogContent className="grid h-[90svh] w-[min(94vw,72rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-3 p-4 sm:p-5">
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle className="truncate text-base" title={previewFile?.filename}>{previewFile?.filename}</DialogTitle>
            <DialogDescription>{previewFile ? `${isPdf(previewFile) ? "PDF" : "Image"}${fileSize(previewFile.size) ? ` · ${fileSize(previewFile.size)}` : ""}` : "Attachment preview"}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/50">
              {previewError ? <p className="px-6 text-center text-sm text-muted-foreground">{previewError}</p> : previewUrl && previewFile ? isPdf(previewFile) ? <iframe src={previewUrl} title={`Preview ${previewFile.filename}`} className="size-full border-0" /> : <img src={previewUrl} alt={previewFile.filename} className="max-h-full max-w-full object-contain" /> : <p className="text-sm text-muted-foreground">{thumbnailsLoading || previewFile && isPdf(previewFile) ? "Loading preview…" : "Preview unavailable. You can still download the file."}</p>}
            </div>
            {previewFile && <Button type="button" variant="outline" className="self-end" onClick={() => onDownload(message, previewFile)} disabled={downloadingAttachmentId === previewFile.id}><Download className="size-4" aria-hidden="true" /> Download</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
