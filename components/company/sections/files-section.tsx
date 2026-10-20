"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { File as FileIcon, Film, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import type { ExtraDocumentEntry } from "@/components/company/company-documents"
import { useCompanyPage } from "@/components/company/company-page-context"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { CLIENT_FILE_MAX_BYTES, createDocument, deleteDocument, getCompanyFiles, uploadClientFile, type SharedDocument } from "@/lib/documents"

const KIND_ICON = { image: ImageIcon, video: Film, file: FileIcon } as const

function fileKind(file: { type?: string }): keyof typeof KIND_ICON {
  if (file.type === "image") return "image"
  if (file.type === "video") return "video"
  return "file"
}

/**
 * Files filed under the company, shown in the same list as its documents.
 * Anyone signed in to the page can upload; admins and the uploader can delete.
 */
export function useCompanyFiles(): { entries: ExtraDocumentEntry[]; addItem: ReactNode; dialogs: ReactNode; upload: () => void } {
  const { user } = useAuth()
  const { company, isAdmin, visitorAgencyId } = useCompanyPage()
  const [files, setFiles] = useState<SharedDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!user || !visitorAgencyId) return
    try {
      // Campaign media lives in each campaign, so only files with no campaign show here.
      setFiles((await getCompanyFiles(visitorAgencyId, company.id)).filter((file) => !file.projectId))
    } catch (error) {
      console.error("Couldn't load company files", error)
    }
  }, [user, visitorAgencyId, company.id])

  useEffect(() => { void load() }, [load])

  const upload = useCallback(() => inputRef.current?.click(), [])

  async function uploadFiles(list: File[]) {
    if (!user || list.length === 0) return
    setUploading(true)
    const toastId = toast.loading(list.length === 1 ? `Uploading ${list[0].name}…` : `Uploading ${list.length} files…`)
    let done = 0
    for (const file of list) {
      if (file.size > CLIENT_FILE_MAX_BYTES) {
        toast.error(`"${file.name}" is larger than 20 MB.`)
        continue
      }
      try {
        const url = await uploadClientFile(file, user.uid, (pct) => toast.loading(`Uploading ${file.name}… ${pct}%`, { id: toastId }))
        const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file"
        await createDocument({
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          url,
          companyId: company.id,
          sharedWith: "Company",
          sharedWithUserIds: [],
          type,
          thumbnailUrl: type === "image" ? url : undefined,
          uploadedBy: user.uid,
        })
        done += 1
      } catch (error) {
        console.error("Upload failed", error)
        toast.error(`Couldn't upload "${file.name}". Please try again.`)
      }
    }
    toast.dismiss(toastId)
    if (done) toast.success(done === 1 ? "File uploaded" : `${done} files uploaded`)
    setUploading(false)
    await load()
  }

  const entries: ExtraDocumentEntry[] = files.map((file) => {
    const Icon = KIND_ICON[fileKind(file)]
    const canDelete = isAdmin || (Boolean(user) && file.uploadedBy === user?.uid)
    return {
      key: `file-${file.id}`,
      title: file.title || "File",
      kindLabel: "File",
      statusLabel: "",
      updatedMs: file.createdAt?.toMillis() ?? 0,
      icon: <Icon className="size-5 text-muted-foreground" aria-hidden="true" />,
      thumbnail: Icon,
      actions: {
        noun: "file",
        name: file.title || "File",
        onOpen: () => window.open(file.url, "_blank", "noopener,noreferrer"),
        onDelete: canDelete ? async () => {
          try {
            await deleteDocument(file.id)
            await load()
          } catch {
            toast.error("Couldn't delete the file.")
          }
        } : undefined,
      },
    }
  })

  const addItem = user ? <DropdownMenuItem disabled={uploading} onSelect={upload}>Upload files</DropdownMenuItem> : null

  const dialogs = user ? (
    <input
      ref={inputRef}
      type="file"
      multiple
      className="hidden"
      onChange={(event) => {
        const list = Array.from(event.target.files ?? [])
        event.target.value = ""
        void uploadFiles(list)
      }}
    />
  ) : null

  return { entries, addItem, dialogs, upload }
}
