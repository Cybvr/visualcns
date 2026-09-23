"use client"

import { useRef, useState } from "react"
import { Loader2, Play, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { mediaKindForFile, mediaKindForUrl } from "@/lib/media"

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

export async function uploadToCloudinary(file: File): Promise<string> {
  const kind = mediaKindForFile(file)
  if (!kind) throw new Error("Choose an image or video file.")

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", UPLOAD_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${kind}/upload`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) throw new Error("Upload failed")
  const data = await res.json()
  return data.secure_url as string
}

interface ImageDropzoneProps {
  value: string
  onChange: (url: string) => void
  label?: string
  compact?: boolean
  /** Replaces the "Add logo" text beside the compact picker, e.g. with the person's name. */
  caption?: React.ReactNode
}

export function ImageDropzone({ value, onChange, label, compact = false, caption }: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      onChange(url)
    } catch (e) {
      console.error("Upload error:", e)
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {label && <p className="text-sm font-medium leading-none">{label}</p>}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "group relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border bg-muted transition-colors",
              dragging && "ring-2 ring-accent",
            )}
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {uploading ? (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : value ? (
              <img src={value} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Upload className="size-5" />
              </div>
            )}
            {value && !uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-[10px] font-medium text-white">Change</span>
              </div>
            )}
            {value && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange("") }}
                aria-label="Remove logo"
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
              >
                <X className="size-3" />
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ""
              }}
            />
          </div>
          {caption ? (
            <div className="min-w-0 truncate text-base font-semibold">{caption}</div>
          ) : (
            <div>
              <p className="text-sm font-medium">{value ? "Change logo" : "Add logo"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Square image recommended</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm font-medium leading-none">{label}</p>}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer",
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/60",
          value ? "p-2" : "p-8"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center gap-2 h-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs">Uploading…</p>
          </div>
        ) : value ? (
          <div className="relative group">
            <img src={value} alt="" className="w-full h-48 object-cover rounded" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
              <p className="text-white text-sm font-medium">Click or drop to replace</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange("") }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="w-8 h-8" />
            <p className="text-sm">Drop image here or click to browse</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}

interface GalleryDropzoneProps {
  value: string[]
  onChange: (urls: string[]) => void
  acceptVideos?: boolean
}

export function GalleryDropzone({ value, onChange, acceptVideos = false }: GalleryDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setError(null)
    const accepted = Array.from(files).filter((file) => {
      const kind = mediaKindForFile(file)
      return kind === "image" || (acceptVideos && kind === "video")
    })

    if (accepted.length === 0) {
      setError(acceptVideos ? "Choose image or video files." : "Choose image files.")
      return
    }

    setUploading(true)
    try {
      const results = await Promise.allSettled(accepted.map(uploadToCloudinary))
      const uploads = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
      if (uploads.length > 0) onChange([...value, ...uploads])
      if (uploads.length < accepted.length) {
        setError(`${accepted.length - uploads.length} ${accepted.length - uploads.length === 1 ? "file" : "files"} could not be uploaded. Try again.`)
      }
    } finally {
      setUploading(false)
    }
  }

  function removeMedia(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group aspect-square">
              {mediaKindForUrl(url) === "video" ? (
                <>
                  <video src={url} muted playsInline preload="metadata" className="h-full w-full rounded object-cover" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 text-white">
                    <Play className="size-5 fill-current" aria-hidden="true" />
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-cover rounded" />
              )}
              <button
                type="button"
                onClick={() => removeMedia(i)}
                aria-label={`Remove ${mediaKindForUrl(url)}`}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/60"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
        }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Uploading…</p>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <p className="text-sm">Drop {acceptVideos ? "images or videos" : "images"} here or click to browse</p>
              <p className="text-xs">You can select multiple files</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptVideos ? "image/*,video/*" : "image/*"}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
