"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { ArrowUp, Check, ChevronDown, ChevronRight, FileText, ListChecks, Loader2, Megaphone, MessageSquare, Mic, Plus, UploadCloud, X } from "lucide-react"

import { NgaiMark } from "@/components/agent/ngai-mark"
import type { AgentArtifact, AgentConversation, AgentFile, AgentForm, AgentMention, AgentMessage, AgentPlan } from "@/components/agent/agent-context"
import { ArtifactCard } from "@/components/dashboard/document-artifact"
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

/**
 * What Ngai did while working. Live, the last line spins; afterwards the list
 * folds into one line the user can open.
 */
function AgentSteps({ steps, live }: { steps: string[]; live: boolean }) {
  const [open, setOpen] = useState(false)
  if (!steps.length) return null

  if (live) {
    return (
      <ol className="space-y-1.5 pt-1 text-sm text-muted-foreground" role="status" aria-live="polite">
        {steps.map((label, index) => (
          <li key={`${index}-${label}`} className="flex items-center gap-2">
            {index === steps.length - 1 ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            )}
            <span className="min-w-0 truncate">{label}</span>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className="mb-2 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {steps.length} step{steps.length === 1 ? "" : "s"}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1">
          {steps.map((label, index) => (
            <li key={`${index}-${label}`} className="flex items-center gap-2">
              <Check className="size-3 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="min-w-0 truncate">{label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** A checklist Ngai wants approved before a big job. Go sends the approval back. */
function AgentPlanCard({ plan, active, disabled, onSubmit }: { plan: AgentPlan; active: boolean; disabled: boolean; onSubmit: (text: string) => void }) {
  return (
    <div className="mt-3 w-full rounded-[16px] border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-medium">
        <ListChecks className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0">{plan.title}</span>
      </p>
      <ol className="mt-3 space-y-2">
        {plan.steps.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-2.5">
            <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ol>
      {active && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-muted-foreground">Or type what to change.</span>
          <Button type="button" size="sm" disabled={disabled} onClick={() => onSubmit("Go ahead with the plan.")}>
            Go ahead
          </Button>
        </div>
      )}
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

const DEFAULT_STARTING_OPTIONS = [
  "Give me a summary",
  "Create an invoice",
  "Draft a document",
  "Add a task",
]

type MentionTrigger = { start: number; end: number; query: string }

function campaignMentionAt(value: string, cursor: number): MentionTrigger | null {
  const beforeCursor = value.slice(0, cursor)
  const match = /(^|\s)@([^@\n]*)$/.exec(beforeCursor)
  if (!match) return null
  const query = match[2]
  // Once another sentence boundary is reached this is ordinary text, not a campaign search.
  if (query.length > 80 || /[.,!?;:]\s/.test(query)) return null
  const start = match.index + match[1].length
  return { start, end: cursor, query: query.trimStart() }
}

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
  startingOptions = DEFAULT_STARTING_OPTIONS,
  allowAttachments = true,
  welcome,
  campaignMentions,
  onOpenArtifact,
  activeArtifactId,
}: {
  messages: AgentMessage[]
  conversations: AgentConversation[]
  activeConversationId: string
  sending: boolean
  firstName: string
  onSend: (text: string, images?: string[], files?: AgentFile[], mentions?: AgentMention[]) => void
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  compact?: boolean
  className?: string
  /** The suggestion buttons on a new chat. */
  startingOptions?: string[]
  /** Off for signed-out visitors, who can't upload files. */
  allowAttachments?: boolean
  /** Heading on a new chat. Defaults to welcoming the signed-in person by name. */
  welcome?: string
  /** Campaigns available to the @ mention picker. Omit to disable campaign mentions. */
  campaignMentions?: AgentMention[]
  /** Opens a document Ngai made, beside the chat. Omit to hide the cards. */
  onOpenArtifact?: (artifact: AgentArtifact) => void
  /** The document open now, so its card shows as open. */
  activeArtifactId?: string
}) {
  const recentChats = conversations.filter((conversation) => conversation.messages.length > 0).slice(0, 3)
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [selectedMentions, setSelectedMentions] = useState<AgentMention[]>([])
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(null)
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const textInput = useRef<HTMLTextAreaElement>(null)
  const dragDepth = useRef(0)
  const transcriptEnd = useRef<HTMLDivElement>(null)
  // The last assistant message is empty while its stream is still arriving.
  const streaming = sending && messages[messages.length - 1]?.content === ""
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !uploading && !streaming
  const matchingCampaigns = mentionTrigger
    ? (campaignMentions ?? [])
        .filter((campaign) => !selectedMentions.some((selected) => selected.id === campaign.id))
        .filter((campaign) => campaign.label.toLowerCase().includes(mentionTrigger.query.toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, sending])

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
    setSelectedMentions([])
    setMentionTrigger(null)
    requestAnimationFrame(() => textInput.current?.focus())
  }

  function availableMentionTrigger(value: string, cursor: number, mentions = selectedMentions) {
    const trigger = campaignMentions ? campaignMentionAt(value, cursor) : null
    if (!trigger) return null
    const followsSelectedMention = mentions.some((mention) => {
      const token = `@${mention.label}`
      return value.slice(trigger.start, trigger.start + token.length) === token
    })
    return followsSelectedMention ? null : trigger
  }

  function updateInput(value: string, cursor: number) {
    setInput(value)
    const remainingMentions = selectedMentions.filter((mention) => value.includes(`@${mention.label}`))
    setSelectedMentions(remainingMentions)
    setMentionTrigger(availableMentionTrigger(value, cursor, remainingMentions))
    setActiveMentionIndex(0)
  }

  function selectCampaignMention(campaign: AgentMention) {
    if (!mentionTrigger) return
    const token = `@${campaign.label}`
    const before = input.slice(0, mentionTrigger.start)
    const after = input.slice(mentionTrigger.end)
    const separator = after.startsWith(" ") || after.length === 0 ? "" : " "
    const next = `${before}${token}${separator}${after}`
    const cursor = before.length + token.length + (after.length === 0 ? 1 : separator.length)
    setInput(after.length === 0 ? `${next} ` : next)
    setSelectedMentions((current) => current.some((item) => item.id === campaign.id) ? current : [...current, campaign])
    setMentionTrigger(null)
    setActiveMentionIndex(0)
    requestAnimationFrame(() => {
      textInput.current?.focus()
      textInput.current?.setSelectionRange(cursor, cursor)
    })
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const content = input.trim()
    if ((!content && !attachments.length) || sending || uploading) return
    const images = attachments.filter((item) => item.mimeType.startsWith("image/")).map((item) => item.url)
    const files: AgentFile[] = attachments
      .filter((item) => !item.mimeType.startsWith("image/"))
      .map(({ name, url, mimeType }) => ({ name, url, mimeType }))
    const mentions = selectedMentions.filter((mention) => content.includes(`@${mention.label}`))
    onSend(content, images, files, mentions)
    setInput("")
    setSelectedMentions([])
    setMentionTrigger(null)
    setAttachments([])
    setAttachError("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionTrigger && matchingCampaigns.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        setActiveMentionIndex((current) => {
          const direction = event.key === "ArrowDown" ? 1 : -1
          return (current + direction + matchingCampaigns.length) % matchingCampaigns.length
        })
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        selectCampaignMention(matchingCampaigns[activeMentionIndex] ?? matchingCampaigns[0])
        return
      }
    }
    if (mentionTrigger && event.key === "Escape") {
      event.preventDefault()
      setMentionTrigger(null)
      return
    }
    if (event.nativeEvent.isComposing) return
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div
      className={cn("dashboard-body agent-chat-root relative flex h-full min-h-0 flex-col md:overflow-hidden font-dashboard [&_*]:font-dashboard", compact ? "bg-background" : "agent-surface", className)}
      onDragEnter={allowAttachments ? handleDragEnter : undefined}
      onDragOver={allowAttachments ? handleDragOver : undefined}
      onDragLeave={allowAttachments ? handleDragLeave : undefined}
      onDrop={allowAttachments ? handleDrop : undefined}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[16px] border-2 border-dashed border-accent px-6 py-10 text-center">
            <UploadCloud className="size-8 text-accent" aria-hidden="true" />
            <p className="text-sm font-medium">Drop files or paste an image</p>
          </div>
        </div>
      )}
      {messages.length === 0 ? (
        <div className={cn("scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto text-center", compact ? "px-4 py-6" : "px-4 py-6 sm:px-6 sm:pb-16")}>
          <div className="m-auto flex w-full min-w-0 max-w-lg flex-col items-center">
            <NgaiMark role="img" aria-hidden={false} aria-label="Ngai" className={compact ? "size-9" : "size-10 sm:size-12"} />
            <h1 className={cn("mt-4 font-sans tracking-[-0.02em] sm:mt-6", compact ? "text-xl" : "text-2xl sm:text-3xl")}>
              {welcome ?? `Welcome to Ngai, ${firstName}`}
            </h1>
            <div className={cn("mt-5 flex flex-wrap justify-center gap-2 sm:mt-6", compact ? "max-w-[20rem]" : "max-w-xl")}>
              {startingOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSend(option)}
                  disabled={sending}
                  className="agent-start-option rounded-full border border-border bg-background px-4 py-2 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
            {recentChats.length > 0 && (
              <div className={cn("mt-8 w-full min-w-0 text-left", compact ? "max-w-[20rem]" : "max-w-md")}>
                <p className="agent-recent-label px-1 text-muted-foreground">Recent</p>
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                  {recentChats.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(conversation.id)}
                        className="agent-recent-item flex w-full items-center gap-3 px-4 py-3 text-left text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                      >
                        <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "scrollbar-none mx-auto flex w-full min-h-0 flex-1 flex-col overflow-y-auto",
            compact ? "gap-5 px-4 py-5" : "max-w-3xl gap-7 px-4 py-8 sm:px-6",
          )}
        >
          {messages.map((message, messageIndex) => (
            <div
              key={message.id}
              className={cn("flex w-full", message.role === "user" ? "justify-end" : "items-start gap-3")}
            >
              {message.role === "assistant" && (
                <Image src="/ngai-logo.png" alt="Ngai" width={28} height={28} className="mt-0.5 shrink-0 rounded-full" />
              )}
              {message.role === "assistant" && !message.content ? (
                message.steps?.length ? (
                  <AgentSteps steps={message.steps} live />
                ) : (
                  <span className="flex items-center gap-2 pt-1 text-sm text-muted-foreground" role="status" aria-live="polite">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Thinking
                  </span>
                )
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
                    <>
                      {message.steps && message.steps.length > 0 && <AgentSteps steps={message.steps} live={false} />}
                      <AgentMarkdown content={message.content} />
                    </>
                  )}
                  {message.form && (
                    <AgentFormCard form={message.form} disabled={sending} onSubmit={onSend} />
                  )}
                  {message.plan && (
                    <AgentPlanCard plan={message.plan} active={messageIndex === messages.length - 1} disabled={sending} onSubmit={onSend} />
                  )}
                  {message.artifacts?.length && onOpenArtifact ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {message.artifacts.map((artifact) => (
                        <ArtifactCard
                          key={`${artifact.kind}-${artifact.id}`}
                          artifact={artifact}
                          active={activeArtifactId === artifact.id}
                          onOpen={() => onOpenArtifact(artifact)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          <div ref={transcriptEnd} />
        </div>
      )}

      <div className={cn("sticky bottom-0 z-10 shrink-0", compact ? "border-t border-border/60 bg-background/95 px-4 supports-[backdrop-filter]:backdrop-blur-sm pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2" : "px-2 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-1 sm:px-3")}>
        <form
          onSubmit={submit}
          className={cn(
            "mx-auto flex w-full flex-col gap-2",
            compact
              ? "rounded-[16px] bg-sidebar-accent/25 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              : "max-w-3xl rounded-[16px] bg-sidebar-accent/25 p-1.5",
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
          <div className="relative space-y-2">
            <input ref={fileInput} type="file" accept={ACCEPT_ATTR} multiple onChange={handleFiles} className="hidden" />
            {mentionTrigger && campaignMentions && (
              <div
                id="ngai-campaign-mentions"
                role="listbox"
                aria-label="Campaigns"
                className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-64 overflow-y-auto rounded-[14px] bg-popover p-1.5 text-popover-foreground shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
              >
                {matchingCampaigns.length > 0 ? matchingCampaigns.map((campaign, index) => (
                  <button
                    key={campaign.id}
                    id={`ngai-campaign-${campaign.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeMentionIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCampaignMention(campaign)}
                    onMouseEnter={() => setActiveMentionIndex(index)}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-foreground outline-none",
                      index === activeMentionIndex && "bg-muted",
                    )}
                  >
                    <Megaphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{campaign.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">Campaign</span>
                  </button>
                )) : (
                  <p className="px-3 py-2.5 text-sm text-muted-foreground">No campaigns match “{mentionTrigger.query}”.</p>
                )}
              </div>
            )}
            <Textarea
              ref={textInput}
              value={input}
              onChange={(event) => updateInput(event.target.value, event.target.selectionStart ?? event.target.value.length)}
              onKeyDown={handleKeyDown}
              onClick={(event) => setMentionTrigger(availableMentionTrigger(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length))}
              onBlur={() => setMentionTrigger(null)}
              onPaste={allowAttachments ? handlePaste : undefined}
              rows={1}
              placeholder="Ask Ngai"
              aria-label="Message Ngai"
              aria-autocomplete={campaignMentions ? "list" : undefined}
              aria-expanded={campaignMentions ? Boolean(mentionTrigger) : undefined}
              aria-controls={mentionTrigger ? "ngai-campaign-mentions" : undefined}
              aria-activedescendant={mentionTrigger && matchingCampaigns[activeMentionIndex] ? `ngai-campaign-${matchingCampaigns[activeMentionIndex].id}` : undefined}
              className="agent-composer-input h-auto min-h-0 max-h-40 w-full resize-none overflow-y-auto rounded-lg border-0 bg-transparent! px-2 py-1 text-sm !text-foreground placeholder:!text-foreground font-medium shadow-none outline-none focus:border-transparent focus-visible:border-transparent focus:ring-0 focus-visible:ring-0"
            />
            <div className="flex items-center justify-between">
            {allowAttachments ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Attach file"
                disabled={uploading || streaming}
                onClick={() => fileInput.current?.click()}
                className="size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-5" aria-hidden="true" />
              </Button>
            ) : <span aria-hidden="true" />}
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
                  "size-8 shrink-0 rounded-full hover:bg-muted hover:text-foreground",
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
              className="size-8 shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
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
