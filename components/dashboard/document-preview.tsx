"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import { formatMoney } from "@/lib/billing"
import { cn } from "@/lib/utils"

type Block = { kind: "h1" | "h2" | "p" | "li" | "todo" | "quote"; text: string; done?: boolean }

/** Enough blocks to fill the first page of a thumbnail. */
const MAX_BLOCKS = 14

/**
 * Reads rich-text HTML into plain text blocks. Nothing from the HTML is injected
 * into the page: DOMParser does not run scripts, and only text comes out.
 */
function htmlBlocks(html: string): Block[] {
  if (typeof window === "undefined" || !html.trim()) return []
  // Plain text, or markdown-ish notes, has no tags: one paragraph per line.
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, MAX_BLOCKS).map((line) => {
      const todo = line.match(/^-\s*\[([ xX])\]\s*(.*)$/)
      if (todo) return { kind: "todo", text: todo[2], done: todo[1] !== " " }
      const heading = line.match(/^(#{1,6})\s+(.*)$/)
      if (heading) return { kind: heading[1].length === 1 ? "h1" : "h2", text: heading[2] }
      if (/^[-*]\s+/.test(line)) return { kind: "li", text: line.replace(/^[-*]\s+/, "") }
      return { kind: "p", text: line }
    })
  }
  const doc = new DOMParser().parseFromString(html, "text/html")
  const blocks: Block[] = []
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (blocks.length >= MAX_BLOCKS) return
      const tag = child.tagName.toLowerCase()
      const text = (child.textContent ?? "").replace(/\s+/g, " ").trim()
      if (tag === "h1") { if (text) blocks.push({ kind: "h1", text }) }
      else if (/^h[2-6]$/.test(tag)) { if (text) blocks.push({ kind: "h2", text }) }
      else if (tag === "li") {
        if (!text) continue
        const checked = child.getAttribute("data-checked")
        blocks.push(checked === null ? { kind: "li", text } : { kind: "todo", text, done: checked === "true" })
      }
      else if (tag === "blockquote") { if (text) blocks.push({ kind: "quote", text }) }
      else if (tag === "p") { if (text) blocks.push({ kind: "p", text }) }
      else if (["ul", "ol", "div", "section", "article", "table", "tbody", "thead", "tr"].includes(tag)) walk(child)
      else if (text) blocks.push({ kind: "p", text })
    }
  }
  walk(doc.body)
  return blocks
}

/**
 * A sheet of paper inside a thumbnail tile. The page is laid out at 2.5× the
 * tile's width and scaled down, so it reads like a shrunken real page at any size.
 */
/** The colour behind the page, matching the "Make something new" tiles. */
export type PreviewTone = "document" | "invoice" | "estimate" | "contract"

const TONES: Record<PreviewTone, string> = {
  document: "bg-blue-700 dark:bg-blue-900",
  invoice: "bg-emerald-700 dark:bg-emerald-900",
  estimate: "bg-amber-700 dark:bg-amber-900",
  contract: "bg-violet-700 dark:bg-violet-900",
}

function Sheet({ children, tone }: { children: ReactNode; tone?: PreviewTone }) {
  return (
    <div aria-hidden="true" className={cn("absolute inset-0 overflow-hidden", tone ? TONES[tone] : "bg-muted")}>
      <div className="absolute inset-x-[10%] top-[8%] bottom-0 overflow-hidden rounded-t-[3px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="w-[250%] origin-top-left scale-[0.4] p-6 text-[13px] leading-snug text-neutral-800">
          {children}
        </div>
      </div>
    </div>
  )
}

function BlockLine({ block }: { block: Block }) {
  switch (block.kind) {
    case "h1":
      return <div className="mb-2 line-clamp-2 text-[22px] font-bold leading-tight text-neutral-900">{block.text}</div>
    case "h2":
      return <div className="mb-1.5 mt-2 line-clamp-1 text-[16px] font-semibold text-neutral-900">{block.text}</div>
    case "li":
      return <div className="mb-1 flex gap-2 pl-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-neutral-500" /><span className="line-clamp-2">{block.text}</span></div>
    case "todo":
      return (
        <div className="mb-1 flex items-start gap-2">
          <span className={cn("mt-[3px] size-3 shrink-0 rounded-[3px] border border-neutral-400", block.done && "border-neutral-700 bg-neutral-700")} />
          <span className={cn("line-clamp-1", block.done && "text-neutral-400 line-through")}>{block.text}</span>
        </div>
      )
    case "quote":
      return <div className="mb-2 line-clamp-3 border-l-2 border-neutral-300 pl-3 italic text-neutral-600">{block.text}</div>
    default:
      return <p className="mb-2 line-clamp-4">{block.text}</p>
  }
}

/**
 * The first page of a rich-text document, for a thumbnail. Returns null when
 * there is nothing written yet, so the card keeps its icon.
 */
export function DocumentPagePreview({ title, html, tone }: { title?: string; html?: string; tone?: PreviewTone }) {
  // Parsing needs the browser, so the server and first client render both show a blank page.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const blocks = useMemo(() => (mounted ? htmlBlocks(html ?? "") : []), [html, mounted])
  if (mounted && blocks.length === 0) return null
  // Skip a repeated title when the body already starts with it as a heading.
  const showTitle = title?.trim() && !(blocks[0]?.kind === "h1" && blocks[0].text === title.trim())
  return (
    <Sheet tone={tone}>
      {showTitle && <div className="mb-3 line-clamp-2 text-[22px] font-bold leading-tight text-neutral-900">{title}</div>}
      {blocks.map((block, index) => <BlockLine key={index} block={block} />)}
    </Sheet>
  )
}

/** Whether rich-text HTML has any words in it, so an empty document keeps its icon. */
export function hasDocumentText(html?: string) {
  return Boolean(html && html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim())
}

type Line = { label: string; amount: number; muted?: boolean }

/** A shrunken invoice or estimate: heading, who it is for, line items and the total. */
export function BillingPagePreview({
  heading,
  number,
  client,
  lines,
  total,
  currency,
  tone,
}: {
  tone?: PreviewTone
  heading: string
  number?: string
  client?: string
  lines: Line[]
  total: number
  currency: string
}) {
  return (
    <Sheet tone={tone}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="text-[22px] font-bold uppercase tracking-wide text-neutral-900">{heading}</div>
        {number && <div className="pt-1.5 text-neutral-500 tabular-nums">{number}</div>}
      </div>
      {client && (
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400">Bill to</div>
          <div className="line-clamp-1 font-medium">{client}</div>
        </div>
      )}
      <div className="border-t border-neutral-200">
        {lines.slice(0, 6).map((line, index) => (
          <div key={index} className={cn("flex justify-between gap-4 border-b border-neutral-100 py-1.5", line.muted && "text-neutral-400")}>
            <span className="line-clamp-1">{line.label || "Item"}</span>
            <span className="shrink-0 tabular-nums">{formatMoney(line.amount, currency)}</span>
          </div>
        ))}
        {lines.length === 0 && <div className="py-1.5 text-neutral-400">No line items yet</div>}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-[16px] font-semibold text-neutral-900">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(total, currency)}</span>
      </div>
    </Sheet>
  )
}
