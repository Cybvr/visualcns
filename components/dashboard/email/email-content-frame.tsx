"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

/**
 * Email bodies sit in a sandboxed frame, so a clicked link would load inside
 * the frame. Open http(s) and mailto links in a new tab instead; in-page
 * anchors (#...) still scroll the message.
 */
export function openEmailLinksInNewTab(frame: HTMLIFrameElement) {
  const documentNode = frame.contentDocument
  if (!documentNode) return
  documentNode.addEventListener("click", (event) => {
    const target = event.target as Element | null
    const link = target?.closest?.("a[href]") as HTMLAnchorElement | null
    if (!link) return
    const href = link.getAttribute("href") || ""
    if (href.startsWith("#")) return
    event.preventDefault()
    if (!/^(?:https?:|mailto:|tel:)/i.test(link.href)) return
    window.open(link.href, "_blank", "noopener,noreferrer")
  })
}

export function EmailContentFrame({
  title,
  srcDoc,
  className,
  autoHeight = false,
}: {
  title: string
  srcDoc: string
  className?: string
  /** Let the outer mail surface scroll the message and any attachments together. */
  autoHeight?: boolean
}) {
  const observerRef = useRef<ResizeObserver | null>(null)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useEffect(() => () => observerRef.current?.disconnect(), [])

  function measure(frame: HTMLIFrameElement) {
    observerRef.current?.disconnect()

    const documentNode = frame.contentDocument
    const body = documentNode?.body
    const root = documentNode?.documentElement
    if (!body || !root) return

    const updateHeight = () => {
      const nextHeight = Math.max(body.scrollHeight, root.scrollHeight, autoHeight ? 1 : 384)
      setContentHeight((current) => current === nextHeight ? current : nextHeight)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(body)
    observer.observe(root)
    observerRef.current = observer
  }

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      onLoad={(event) => { openEmailLinksInNewTab(event.currentTarget); measure(event.currentTarget) }}
      style={{
        "--email-content-height": contentHeight ? `${contentHeight}px` : autoHeight ? "1px" : "60svh",
      } as CSSProperties}
      className={cn(
        "block w-full border-0",
        autoHeight ? "h-[var(--email-content-height)] min-h-0" : "h-full min-h-96 max-sm:h-[var(--email-content-height)] max-sm:min-h-0",
        className,
      )}
    />
  )
}
