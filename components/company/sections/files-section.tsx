"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { File as FileIcon, Film, Image as ImageIcon, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import type { ExtraDocumentEntry } from "@/components/company/company-documents"
import { useCompanyPage } from "@/components/company/company-page-context"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { deleteCampaignCreative, watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
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
export function useCompanyFiles(
  /** Links already shown elsewhere in the same list, e.g. as campaign media, so they aren't listed twice. */
  hideUrls?: Set<string>,
): { entries: ExtraDocumentEntry[]; addItem: ReactNode; dialogs: ReactNode; upload: () => void } {
  const { user } = useAuth()
  const { company, isAdmin, visitorAgencyId } = useCompanyPage()
  const [files, setFiles] = useState<SharedDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!user || !visitorAgencyId) return
    try {
      setFiles(await getCompanyFiles(visitorAgencyId, company.id))
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

  const entries: ExtraDocumentEntry[] = files.filter((file) => !hideUrls?.has(file.url)).map((file) => {
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
      imageUrl: file.type === "image" ? file.thumbnailUrl || file.url : undefined,
      preview: file.type === "video" ? <VideoThumbnail src={file.url} /> : undefined,
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

/** Every campaign's images, videos and links, shown in the company Drive with the files and documents. */
export function useCompanyCampaignMedia(): { entries: ExtraDocumentEntry[]; urls: Set<string> } {
  const { company, isAdmin } = useCompanyPage()
  const [media, setMedia] = useState<CampaignCreative[]>([])

  useEffect(() => watchCompanyCampaignCreatives(
    company.id,
    (creatives) => setMedia(creatives.filter((item) => item.type !== "text" && item.type !== "folder" && item.url)),
    (error) => console.error("Couldn't load campaign media", error),
  ), [company.id])

  const urls = useMemo(() => new Set(media.map((item) => item.url)), [media])
  const entries = media.map((item): ExtraDocumentEntry => {
    const Icon = item.type === "video" ? Film : item.type === "link" ? LinkIcon : ImageIcon
    return {
      key: `media-${item.id}`,
      title: item.title || "Media",
      kindLabel: item.type === "video" ? "Video" : item.type === "link" ? "Link" : "Image",
      statusLabel: "",
      updatedMs: item.updatedAt?.toMillis() ?? item.createdAt?.toMillis() ?? 0,
      icon: <Icon className="size-5 text-muted-foreground" aria-hidden="true" />,
      thumbnail: Icon,
      imageUrl: item.type === "image" ? item.url : undefined,
      preview: item.type === "video" ? <VideoThumbnail src={item.url} /> : undefined,
      actions: {
        noun: item.type === "link" ? "link" : item.type === "video" ? "video" : "image",
        name: item.title || "Media",
        onOpen: () => window.open(item.url, "_blank", "noopener,noreferrer"),
        onDelete: isAdmin ? async () => {
          try {
            await deleteCampaignCreative(item.id)
          } catch {
            toast.error("Couldn't delete that media.")
          }
        } : undefined,
      },
    }
  })
  return { entries, urls }
}
