"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

export function EmailContentFrame({
  title,
  srcDoc,
  className,
}: {
  title: string
  srcDoc: string
  className?: string
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
      const nextHeight = Math.max(body.scrollHeight, root.scrollHeight, 384)
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
      onLoad={(event) => measure(event.currentTarget)}
      style={{
        "--email-content-height": contentHeight ? `${contentHeight}px` : "60svh",
      } as CSSProperties}
      className={cn(
        "block h-full min-h-96 w-full border-0 max-sm:h-[var(--email-content-height)] max-sm:min-h-0",
        className,
      )}
    />
  )
}
