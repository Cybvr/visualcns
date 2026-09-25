"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { ArrowUp, FileText, Loader2, Mic, Plus, UploadCloud, X } from "lucide-react"

import type { AgentConversation, AgentFile, AgentForm, AgentMessage } from "@/components/agent/agent-context"
import { uploadFileToStorage } from "@/lib/documents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import "./agent-chat.css"

/** Inline markdown in one line of an agent reply: bold, italic, code, links. */
function formatInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let index = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${index++}`
    if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>)
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>)
    } else if (token.startsWith("[")) {
      const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token)
      const internal = link ? link[2].startsWith("/") : false
      nodes.push(
        link ? (
          <a
            key={key}
            href={link[2]}
            {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}
            className="font-medium underline underline-offset-4"
          >
            {link[1]}
          </a>
        ) : (
          token
        ),
      )
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** The markdown the agent actually returns: paragraphs, bullet and numbered lists. */
function AgentMarkdown({ content }: { content: string }) {
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  let numbers: string[] = []

  function flushBullets() {
    if (!bullets.length) return
    const items = bullets
    const at = blocks.length
    bullets = []
    blocks.push(
      <ul key={`ul-${at}`} className="list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{formatInline(item, `ul-${at}-${i}`)}</li>
        ))}
      </ul>,
    )
  }

  function flushNumbers() {
    if (!numbers.length) return
    const items = numbers
    const at = blocks.length
    numbers = []
    blocks.push(
      <ol key={`ol-${at}`} className="list-decimal space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{formatInline(item, `ol-${at}-${i}`)}</li>
        ))}
      </ol>,
    )
  }

  for (const line of content.split("\n")) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim())
    if (heading) {
      flushBullets()
      flushNumbers()
      const level = Math.min(6, heading[1].length)
      const Heading = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : level === 4 ? "h4" : level === 5 ? "h5" : "h6"
      blocks.push(
        <Heading key={`heading-${blocks.length}`} className={cn("font-semibold tracking-tight", level <= 2 ? "text-lg" : "text-base")}>
          {formatInline(heading[2], `heading-${blocks.length}`)}
        </Heading>,
      )
      continue
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line)
    if (bullet) {
      flushNumbers()
      bullets.push(bullet[1])
      continue
    }
    if (numbered) {
      flushBullets()
      numbers.push(numbered[1])
      continue
    }
    flushBullets()
    flushNumbers()
    if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{formatInline(line, `p-${blocks.length}`)}</p>)
  }
  flushBullets()
  flushNumbers()

  return <div className="space-y-3">{blocks}</div>
}

/**
 * The inline form the agent sends instead of listing required fields in prose.
 * Submitting sends the answers back as the user's next message.
 */
function AgentFormCard({ form, disabled, onSubmit }: { form: AgentForm; disabled: boolean; onSubmit: (text: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  const field = form.fields[step]
  const total = form.fields.length
  const value = field ? values[field.id] ?? "" : ""
  const answered = value.trim().length > 0

  function commit(nextValues: Record<string, string>) {
    if (step + 1 < total) {
      setStep(step + 1)
      return
    }
    setDone(true)
    const lines = form.fields
      .map((item) => ({ item, answer: nextValues[item.id]?.trim() }))
      .filter((entry) => entry.answer)
      .map((entry) => `${entry.item.label}: ${entry.answer}`)
    onSubmit(lines.length ? lines.join("\n") : "Skip the questions, I'll say it in my own words.")
  }

  function answer(next: string) {
    const nextValues = { ...values, [field.id]: next }
    setValues(nextValues)
    commit(nextValues)
  }

  if (done || !field) return null

  return (
    <div className="mt-3 w-full rounded-[16px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium">{field.label}</p>
        {total > 1 && (
          <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
            {step + 1} of {total}
          </span>
        )}
      </div>

      <div className="mt-3">
        {field.type === "select" && field.options?.length ? (
          <Select value={value} onValueChange={(next) => answer(next)} disabled={disabled}>
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder={field.placeholder ?? `Choose ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === "textarea" ? (
          <Textarea
            autoFocus
            value={value}
            onChange={(event) => setValues({ ...values, [field.id]: event.target.value })}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            className="min-h-16 text-sm"
          />
        ) : (
          <Input
            autoFocus
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            value={value}
            onChange={(event) => setValues({ ...values, [field.id]: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && answered) {
                event.preventDefault()
                commit(values)
              }
            }}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            className="h-9 text-sm"
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => commit(values)}>
          Skip
        </Button>
        {field.type !== "select" && (
          <Button type="button" size="sm" disabled={disabled || !answered} onClick={() => commit(values)}>
            {step + 1 < total ? "Next" : "Done"}
          </Button>
        )}
      </div>
    </div>
  )
}

/** One attachment held in the composer before the message is sent. */
type ComposerAttachment = { name: string; url: string; mimeType: string }

/** Types the picker offers and a drop is allowed to add. */
const ACCEPT_ATTR = ".pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt"
const ALLOWED_EXTENSION = /\.(pdf|png|jpe?g|gif|webp|heic|heif|svg|doc|docx|xls|xlsx|csv|txt)$/i

/** The slice of the Web Speech API the composer's voice button uses. */
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function isAllowedFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf" || ALLOWED_EXTENSION.test(file.name)
}

/** Chips shown once a file is attached; each prefills the composer, the user adds the client and sends. */
const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Add to Drive", prompt: "File this into the client's documents." },
  { label: "Make invoice", prompt: "Turn this into a draft invoice for the client." },
  { label: "Make estimate", prompt: "Turn this into a draft estimate for the client." },
  { label: "Make contract", prompt: "Turn this into a draft contract for the client." },
]

/**
 * The agent conversation surface, shared by the full-page route and the
 * dashboard dock. `compact` tightens spacing for the narrow docked panel.
 */
export function AgentChat({
  messages,
  conversations,
  activeConversationId,
  sending,
  firstName,
  onSend,
  onSelectConversation,
  onNewChat,
  compact = false,
  className,
}: {
  messages: AgentMessage[]
  conversations: AgentConversation[]
  activeConversationId: string
  sending: boolean
  firstName: string
  onSend: (text: string, images?: string[], files?: AgentFile[]) => void
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  compact?: boolean
  className?: string
}) {
  const startingOptions = [
    "Summary",
    "Create an invoice",
    "Create an estimate",
    "Create a contract",
    "Add a company",
    "Create a project",
    "Create a task",
    "How many projects do I have?",
  ]
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState("")
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const textInput = useRef<HTMLTextAreaElement>(null)
  const dragDepth = useRef(0)
  const transcriptEnd = useRef<HTMLDivElement>(null)
  // The last assistant message is empty while its stream is still arriving.
  const streaming = sending && messages[messages.length - 1]?.content === ""
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !uploading && !streaming

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, sending])

  // Grow the composer with its content, from one line up to four, then scroll.
  useEffect(() => {
    const el = textInput.current
    if (!el) return
    const style = getComputedStyle(el)
    const lineHeight = parseFloat(style.lineHeight) || 20
    const maxHeight = lineHeight * 4 + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [input])

  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognition = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognition()))
    return () => recognition.current?.abort()
  }, [])

  function toggleVoice() {
    if (listening) {
      recognition.current?.stop()
      return
    }
    const Recognition = getSpeechRecognition()
    if (!Recognition) return
    const instance = new Recognition()
    const base = input.trim()
    instance.lang = navigator.language || "en-US"
    instance.interimResults = true
    instance.continuous = true
    instance.onresult = (event) => {
      let spoken = ""
      for (let i = 0; i < event.results.length; i++) spoken += event.results[i][0].transcript
      setInput([base, spoken.trim()].filter(Boolean).join(" "))
    }
    instance.onend = () => {
      setListening(false)
      recognition.current = null
      textInput.current?.focus()
    }
    instance.onerror = () => setListening(false)
    recognition.current = instance
    setListening(true)
    instance.start()
  }

  async function uploadFiles(fileList: File[]) {
    const files = fileList.filter(isAllowedFile)
    if (!files.length) {
      if (fileList.length) setAttachError("That file type isn’t supported.")
      return
    }
    setAttachError("")
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          url: await uploadFileToStorage(file),
          mimeType: file.type || "application/octet-stream",
        })),
      )
      setAttachments((current) => [...current, ...uploaded])
    } catch {
      setAttachError("Couldn’t upload that file. Try again.")
    } finally {
      setUploading(false)
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    void uploadFiles(files)
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (streaming || uploading) return

    const files = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
      .map((file, index) => {
        if (file.name) return file
        const extension = file.type.split("/")[1]?.split("+")[0] || "png"
        return new File([file], `pasted-image-${Date.now()}-${index}.${extension}`, { type: file.type })
      })

    if (!files.length) return
    event.preventDefault()
    void uploadFiles(files)
  }

  function hasFiles(event: DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files")
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event) || streaming) return
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event) || streaming) return
    event.preventDefault()
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (streaming) return
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length) void uploadFiles(files)
  }

  function applyQuickAction(prompt: string) {
    setInput(prompt)
    requestAnimationFrame(() => textInput.current?.focus())
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const content = input.trim()
    if ((!content && !attachments.length) || sending || uploading) return
    const images = attachments.filter((item) => item.mimeType.startsWith("image/")).map((item) => item.url)
    const files: AgentFile[] = attachments
      .filter((item) => !item.mimeType.startsWith("image/"))
      .map(({ name, url, mimeType }) => ({ name, url, mimeType }))
    onSend(content, images, files)
    setInput("")
    setAttachments([])
    setAttachError("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div
      className={cn("dashboard-body relative flex h-full min-h-0 flex-col md:overflow-hidden font-sans [&_*]:font-sans", compact ? "bg-background" : "agent-surface", className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[16px] border-2 border-dashed border-accent px-6 py-10 text-center">
            <UploadCloud className="size-8 text-accent" aria-hidden="true" />
            <p className="text-sm font-medium">Drop files or paste an image</p>
            <p className="text-xs text-muted-foreground">PDFs and images can be read. Other files can be filed to a company.</p>
          </div>
        </div>
      )}
      {messages.length === 0 ? (
        <div className={cn("scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto text-center", compact ? "px-4 py-6" : "px-4 py-6 sm:px-6 sm:pb-16")}>
          <div className="m-auto flex max-w-lg flex-col items-center">
            <Image src="/ngai-logo.png" alt="Ngai" width={compact ? 36 : 48} height={compact ? 36 : 48} className={compact ? undefined : "size-10 sm:size-12"} priority />
            <h1 className={cn("mt-4 font-sans tracking-[-0.02em] sm:mt-6", compact ? "text-xl" : "text-2xl sm:text-3xl")}>
              Welcome to Ngai, {firstName}
            </h1>
            <div className={cn("mt-4 flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 text-[10px] leading-4 sm:mt-6 md:gap-x-3 md:gap-y-2 md:text-base md:leading-6", compact ? "max-w-[18rem]" : "max-w-2xl")}>
              {startingOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSend(option)}
                  disabled={sending}
                  className="border-b border-border px-1 py-0.5 font-medium md:px-2 md:py-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "scrollbar-none mx-auto flex w-full min-h-0 flex-1 flex-col overflow-y-auto",
            compact ? "gap-5 px-4 py-5" : "max-w-3xl gap-7 px-4 py-8 sm:px-6",
          )}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex w-full", message.role === "user" ? "justify-end" : "items-start gap-3")}
            >
              {message.role === "assistant" && (
                <Image src="/ngai-logo.png" alt="Ngai" width={28} height={28} className="mt-0.5 shrink-0 rounded-full" />
              )}
              {message.role === "assistant" && !message.content ? (
                <span className="flex items-center gap-2 pt-1 text-sm text-muted-foreground" role="status" aria-live="polite">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Thinking
                </span>
              ) : (
                <div
                  className={cn(
                    "leading-6",
                    compact ? "max-w-[88%] text-sm" : "max-w-[85%] text-sm",
                    message.role === "user"
                      ? "whitespace-pre-wrap rounded-[16px] rounded-br-[4px] bg-card px-4 py-2.5 text-foreground"
                      : "pt-0.5 text-foreground",
                  )}
                >
                  {message.role === "user" ? (
                    <>
                      {message.images && message.images.length > 0 && (
                        <div className={cn("flex flex-wrap gap-2", message.content || message.files?.length ? "mb-2" : "")}>
                          {message.images.map((src, index) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={`${message.id}-img-${index}`} src={src} alt="Attachment" className="max-h-40 w-auto rounded-[10px] border border-border object-cover" />
                          ))}
                        </div>
                      )}
                      {message.files && message.files.length > 0 && (
                        <div className={cn("flex flex-wrap gap-2", message.content ? "mb-2" : "")}>
                          {message.files.map((file, index) => (
                            <a
                              key={`${message.id}-file-${index}`}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex max-w-[14rem] items-center gap-2 rounded-[10px] border border-border bg-background px-3 py-2 text-left text-foreground transition-colors hover:bg-muted"
                            >
                              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                              <span className="truncate text-xs font-medium">{file.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {message.content}
                    </>
                  ) : (
                    <AgentMarkdown content={message.content} />
                  )}
                  {message.form && (
                    <AgentFormCard form={message.form} disabled={sending} onSubmit={onSend} />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={transcriptEnd} />
        </div>
      )}

      <div className={cn("shrink-0", compact ? "bg-transparent px-4 pb-4 pt-2" : "px-4 pb-3 pt-2 sm:px-6 sm:pb-7 sm:pt-3")}>
        <form
          onSubmit={submit}
          className={cn(
            "mx-auto flex w-full flex-col gap-2",
            compact
              ? "rounded-[16px] border border-border bg-background p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              : "max-w-3xl rounded-[16px] border border-border bg-background p-2.5 focus-within:border-ring",
          )}
        >
          {(attachments.length > 0 || uploading) && (
            <div className="flex flex-wrap gap-2 px-1 pt-1">
              {attachments.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative">
                  {item.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.name} className="size-16 rounded-[10px] border border-border object-cover" />
                  ) : (
                    <div className="flex h-16 w-40 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                      <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate text-xs font-medium">{item.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:opacity-80"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {uploading && (
                <div className="flex size-16 items-center justify-center rounded-[10px] border border-dashed border-border text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                </div>
              )}
            </div>
          )}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => applyQuickAction(action.prompt)}
                  disabled={streaming}
                  className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <input ref={fileInput} type="file" accept={ACCEPT_ATTR} multiple onChange={handleFiles} className="hidden" />
            <Textarea
              ref={textInput}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              placeholder="Ask Ngai"
              aria-label="Message Ngai"
              className="min-h-0 w-full resize-none overflow-y-auto rounded-lg border-0 bg-transparent px-2 py-2 shadow-none [field-sizing:fixed] focus-visible:border-transparent focus-visible:ring-0"
            />
            <div className="flex items-center justify-between">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Attach file"
              disabled={uploading || streaming}
              onClick={() => fileInput.current?.click()}
              className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-5" aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-1">
            {voiceSupported && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={listening ? "Stop voice input" : "Voice input"}
                aria-pressed={listening}
                disabled={streaming}
                onClick={toggleVoice}
                className={cn(
                  "size-10 shrink-0 rounded-full hover:bg-muted hover:text-foreground",
                  listening ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <Mic className={cn("size-5", listening && "animate-pulse")} aria-hidden="true" />
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!canSend}
              className="size-10 shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
            </div>
            </div>
          </div>
          {attachError && <p role="alert" className="px-1 text-xs text-destructive">{attachError}</p>}
        </form>
      </div>
    </div>
  )
}
