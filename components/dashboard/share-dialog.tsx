"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronDown, Globe2, Link2, LockKeyhole, Send, X } from "lucide-react"
import { toast } from "sonner"

import { useOptionalAuth } from "@/components/auth-provider"
import { getBusinessProfile } from "@/lib/business-profile"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { parseEmailList, plainTextToEditorHtml, siteUrl } from "@/lib/email-composer"
import { saveEmailDraft, type EmailDraftRecord } from "@/lib/email-drafts"
import { getUsers, type AppUser } from "@/lib/users"
import { cn } from "@/lib/utils"

type ShareDialogProps = {
  path: string
  title: string
  triggerLabel?: string
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  /** When provided, the public link follows the record's persisted share setting. */
  access?: {
    enabled: boolean
    onEnabledChange: (enabled: boolean) => void
    disabled?: boolean
  }
  /** Public share pages use the visitor's mail app instead of the dashboard composer. */
  emailMode?: "internal" | "system"
  /** For opening over something above the usual dialog layer, like the post viewer. */
  contentClassName?: string
}

function suggestedMessage(path: string, title: string): string {
  const pathname = path.split("?")[0].toLowerCase()
  const query = path.includes("?") ? new URLSearchParams(path.split("?")[1]) : null
  if (pathname.includes("/jobs/")) return `Hi,\n\nI thought you might be interested in the ${title} opportunity. You can view the details and apply using the link below.`
  if (pathname.includes("/invoices/")) return `Hi,\n\nPlease find your invoice, ${title}, at the link below. Let me know if you have any questions.`
  if (pathname.includes("/estimates/")) return `Hi,\n\nPlease review the estimate for ${title} using the link below. Let me know if you have any questions.`
  if (pathname.includes("/documents/")) return `Hi,\n\nI've shared ${title} for your review. You can open it using the link below.`
  if (pathname.includes("/notes/")) return `Hi,\n\nI'm sharing ${title} with you. You can read it using the link below.`
  if (query?.has("post")) return `Hi,\n\nHere's ${title} for your review. You can view the post using the link below.`
  if (pathname.includes("/campaigns/") || query?.has("campaign")) return `Hi,\n\nI'd like to share ${title} with you. You can view the campaign using the link below.`
  return `Hi,\n\nI'm sharing ${title} with you. You can open it using the link below.`
}

/** The reusable share layout for emailing a link and controlling general access. */
export function ShareDialog({
  path,
  title,
  triggerLabel = "Share",
  triggerClassName,
  open,
  onOpenChange,
  showTrigger = true,
  access,
  emailMode = "internal",
  contentClassName,
}: ShareDialogProps) {
  const auth = useOptionalAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const [recipientInput, setRecipientInput] = useState("")
  const [contacts, setContacts] = useState<AppUser[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [messageStep, setMessageStep] = useState(false)
  const [recipients, setRecipients] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<"draft" | "send" | null>(null)
  const pendingRef = useRef(false)
  const isOpen = open ?? internalOpen
  const viewer = auth?.isAdmin && !auth.isViewingAs && auth.user?.email ? {
    name: auth.appUser?.displayName?.trim() || auth.user.displayName?.trim() || auth.user.email,
    email: auth.user.email,
    role: auth.role === "superadmin" ? "Super admin" : "Workspace admin",
  } : null

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setRecipientInput("")
      setRecipients([])
      setMessage(null)
      setMessageStep(false)
      setShowSuggestions(false)
    }
    if (onOpenChange) onOpenChange(nextOpen)
    else setInternalOpen(nextOpen)
  }

  useEffect(() => {
    if (!isOpen || emailMode !== "internal") return
    let active = true
    getUsers()
      .then((people) => { if (active) setContacts(people.filter((person) => person.email?.trim())) })
      .catch(() => { if (active) setContacts([]) })
    return () => { active = false }
  }, [isOpen, emailMode])
  const url = path ? siteUrl(path) : ""
  const itemTitle = title.replace(/^Share\s+/i, "")
  const canCopy = Boolean(path && (access?.enabled ?? true))
  const restricted = access?.enabled === false
  const recipientParts = recipientInput.split(/[,;\n]/)
  const searchTerm = recipientParts[recipientParts.length - 1].trim().toLowerCase()
  const selectedEmails = new Set(recipientParts.slice(0, -1).map((part) => part.trim().toLowerCase()))
  const suggestions = showSuggestions && searchTerm
    ? contacts.filter((person) => !selectedEmails.has(person.email.trim().toLowerCase()) && `${person.displayName ?? ""} ${person.company ?? ""} ${person.email}`.toLowerCase().includes(searchTerm)).slice(0, 5)
    : []

  function selectContact(person: AppUser) {
    setRecipientInput([...recipientParts.slice(0, -1).map((part) => part.trim()).filter(Boolean), person.email.trim()].join(", ") + ", ")
    setShowSuggestions(false)
  }

  function reviewMessage() {
    if (!canCopy) return
    const { valid, invalid } = parseEmailList(recipientInput)
    if (invalid.length || !valid.length) {
      toast.error("Enter a valid email address.")
      return
    }
    setRecipients(valid)
    setShowSuggestions(false)
    if (message === null) setMessage(`${suggestedMessage(path, itemTitle)}\n\n${url}`)
    setMessageStep(true)
  }

  async function copyLink() {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not copy the link. Please try again.")
    }
  }

  function emailContent() {
    if (!canCopy || !recipients.length) return null
    const subject = "Sharing " + itemTitle
    const body = message?.trim() || ""
    if (!body.includes(url)) {
      toast.error("Keep the share link in the message.")
      return null
    }
    return { subject, body }
  }

  async function saveDraft() {
    if (pendingRef.current || emailMode === "system") return
    const content = emailContent()
    if (!content) return
    if (!auth?.user) {
      toast.error("Sign in to save this email draft.")
      return
    }
    pendingRef.current = true
    setPendingAction("draft")
    try {
      const draft: EmailDraftRecord = {
        id: crypto.randomUUID(),
        companyId: auth.appUser?.companyId || auth.user.uid,
        createdBy: auth.user.uid,
        to: recipients[0],
        cc: recipients.slice(1).join(",") || undefined,
        subject: content.subject,
        body: plainTextToEditorHtml(content.body),
        messageKind: "transactional",
        brandedEmail: true,
        context: { recipientEmail: recipients[0], cc: recipients.slice(1).join(","), subject: content.subject, body: content.body },
        updatedAt: new Date().toISOString(),
      }
      await saveEmailDraft(draft)
      toast.success("Saved to Email drafts")
      handleOpenChange(false)
    } catch {
      toast.error("Could not save the email draft. Please try again.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  async function sendEmail() {
    if (pendingRef.current) return
    const content = emailContent()
    if (!content) return
    if (emailMode === "system") {
      window.location.href = "mailto:" + recipients.join(",") + "?subject=" + encodeURIComponent(content.subject) + "&body=" + encodeURIComponent(content.body)
      handleOpenChange(false)
      return
    }
    if (!auth?.user) {
      toast.error("Sign in to send this email.")
      return
    }
    pendingRef.current = true
    setPendingAction("send")
    try {
      const [idToken, brand] = await Promise.all([
        auth.user.getIdToken(),
        getBusinessProfile().catch(() => null),
      ])
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [recipients[0]],
          cc: recipients.slice(1),
          type: "transactional",
          subject: content.subject,
          text: content.body,
          html: plainTextToEditorHtml(content.body),
          branded: true,
          brand: brand || undefined,
          history: {
            companyId: auth.appUser?.companyId || auth.user.uid,
            to: recipients[0],
            createdAt: new Date().toISOString(),
            recipients: [{ email: recipients[0] }],
            documentTitle: itemTitle,
          },
        }),
      })
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string; historySaved?: boolean }
      if (!response.ok || !result.id) throw new Error(result.error || "The email could not be sent.")
      if (result.historySaved === false) toast.error("Email sent, but it could not be saved to Sent.")
      else toast.success("Email sent")
      handleOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The email could not be sent. Please try again.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={triggerLabel} title={triggerLabel} className={cn("shrink-0 rounded-full text-foreground hover:bg-muted/50", triggerClassName)}>
            <Send className="size-[18px]" aria-hidden="true" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={cn("max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto p-0", contentClassName)}>
        <DialogHeader className="px-5 pb-2 pt-6 pr-12 sm:px-6">
          <div className="flex items-center gap-2">
            {messageStep && <Button type="button" size="icon" variant="ghost" className="-ml-2 size-9 shrink-0" aria-label="Back to sharing options" onClick={() => setMessageStep(false)}><ArrowLeft className="size-5" aria-hidden="true" /></Button>}
            <DialogTitle className="text-2xl font-normal leading-snug tracking-tight">Share &lsquo;{itemTitle}&rsquo;</DialogTitle>
          </div>
          <DialogDescription className="sr-only">{messageStep ? emailMode === "system" ? "Add a message before opening your email app." : "Send the message now or save it as a draft." : "Email a link or control who can open it."}</DialogDescription>
        </DialogHeader>

        {messageStep ? (
          <div className="space-y-6 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap gap-2" aria-label="Recipients">
              {recipients.map((email) => (
                <span key={email} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
                  <span className="truncate">{email}</span>
                  <button type="button" className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${email}`} onClick={() => {
                    const remaining = recipients.filter((recipient) => recipient !== email)
                    setRecipients(remaining)
                    setRecipientInput(remaining.join(", "))
                    if (!remaining.length) setMessageStep(false)
                  }}><X className="size-4" aria-hidden="true" /></button>
                </span>
              ))}
            </div>
            <div className="space-y-2">
              <label htmlFor="share-message" className="text-sm font-medium">Message</label>
              <Textarea id="share-message" value={message ?? ""} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={6} placeholder="Add a message" className="min-h-36 resize-y" />
            </div>
          </div>
        ) : <div className="space-y-7 px-5 py-5 sm:px-6">
          <fieldset className="relative rounded-md border border-input px-3 pb-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <legend className="px-1 text-sm text-muted-foreground">Send link to a Contact or email address</legend>
            <div className="flex items-center gap-2">
              <Input
                value={recipientInput}
                onChange={(event) => { setRecipientInput(event.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setShowSuggestions(false)
                  if (event.key === "Enter") {
                    event.preventDefault()
                    if (suggestions.length) selectContact(suggestions[0])
                    else reviewMessage()
                  }
                }}
                placeholder="Name or email address"
                aria-label="Email addresses to share with"
                disabled={!canCopy}
                className="h-9 min-w-0 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
              />
              <Button type="button" size="sm" variant="ghost" className="shrink-0 text-primary" onClick={reviewMessage} disabled={!canCopy || !recipientInput.trim()}>
                Next
              </Button>
            </div>
            {suggestions.length > 0 && (
              <div role="listbox" aria-label="Contacts" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {suggestions.map((person) => (
                  <button key={person.uid} type="button" role="option" aria-selected="false" className="flex w-full flex-col rounded-sm px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none" onClick={() => selectContact(person)}>
                    <span className="text-sm font-medium">{person.displayName?.trim() || person.company?.trim() || person.email}</span>
                    <span className="text-xs text-muted-foreground">{person.email}</span>
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {(viewer || (path && !restricted)) && (
            <section aria-labelledby="share-people-title" className="space-y-3">
              <h3 id="share-people-title" className="text-base font-semibold text-foreground">People with access</h3>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary" aria-hidden="true">
                  {viewer ? viewer.name.charAt(0).toUpperCase() : <Globe2 className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{viewer ? `${viewer.name} (you)` : "People with the link"}</p>
                  {viewer && <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{viewer?.role || "Can view"}</span>
              </div>
            </section>
          )}

          <section aria-labelledby="share-general-title" className="space-y-3">
            <h3 id="share-general-title" className="text-base font-semibold text-foreground">General access</h3>
            <div className="flex items-center gap-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", restricted ? "bg-muted text-foreground" : "bg-primary/10 text-primary")} aria-hidden="true">
                {restricted ? <LockKeyhole className="size-5" /> : <Globe2 className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                {access ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" className="-ml-2 h-8 gap-1 px-2 text-sm font-medium" disabled={access.disabled || !path}>
                        {restricted ? "Restricted" : "Anyone with the link"}<ChevronDown className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onSelect={() => access.onEnabledChange(false)}>Restricted</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => access.onEnabledChange(true)}>Anyone with the link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : <p className="text-sm font-medium text-foreground">Anyone with the link</p>}
                <p className="text-xs text-muted-foreground">{!path ? "Save this item to generate a link." : restricted ? "Turn on the link to let others view this item." : "Anyone with the link can view this item."}</p>
              </div>
            </div>
          </section>
        </div>}

        <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
          <Button type="button" variant="outline" className="h-10 rounded-full px-4 text-primary" onClick={() => void copyLink()} disabled={!canCopy}>
            <Link2 className="size-4" aria-hidden="true" />Copy link
          </Button>
          {messageStep ? (
            <div className="flex items-center gap-2">
              {emailMode === "internal" && <Button type="button" variant="ghost" className="h-10 rounded-full px-4" onClick={() => void saveDraft()} disabled={pendingAction !== null}>{pendingAction === "draft" ? "Saving…" : "Save draft"}</Button>}
              <Button type="button" className="h-10 rounded-full px-5" onClick={() => void sendEmail()} disabled={pendingAction !== null}>{pendingAction === "send" ? "Sending…" : emailMode === "system" ? "Open email app" : "Send"}</Button>
            </div>
          ) : (
            <DialogClose asChild>
              <Button type="button" className="h-10 rounded-full px-6">Done</Button>
            </DialogClose>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
