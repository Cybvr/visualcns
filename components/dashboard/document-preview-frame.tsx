"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

/** Shows the complete printable document as a scaled thumbnail without an inner scrollbar. */
export function DocumentPreviewFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const frame = frameRef.current
    const documentNode = documentRef.current
    if (!frame || !documentNode) return

    const measure = () => {
      const availableWidth = Math.max(frame.clientWidth - 16, 1)
      const availableHeight = Math.max(frame.clientHeight - 16, 1)
      const documentWidth = Math.max(documentNode.scrollWidth, 1)
      const documentHeight = Math.max(documentNode.scrollHeight, 1)

      setScale(Math.min(1, availableWidth / documentWidth, availableHeight / documentHeight))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    observer.observe(documentNode)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={frameRef} className="h-[70vh] max-h-[48rem] overflow-hidden rounded-md bg-muted/30 p-2">
      <div
        ref={documentRef}
        className="origin-top-left"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "100%" }}
      >
        {children}
      </div>
    </div>
  )
}
