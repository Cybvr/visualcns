"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { EmailComposer } from "@/components/dashboard/email/email-composer"
import { useHideMobileFooter } from "@/components/dashboard/page-title-context"
import { MAX_EMAIL_ATTACHMENTS, MAX_EMAIL_ATTACHMENT_BYTES, MAX_EMAIL_ATTACHMENT_MEGABYTES, type StoredEmailAttachment } from "@/lib/email-attachments"
import { prepareEmailAttachment, removeUploadedEmailAttachments, uploadEmailAttachments } from "@/lib/email-attachment-uploads"
import { parseEmailList, plainTextToEditorHtml } from "@/lib/email-composer"
import { markdownToHtml } from "@/lib/markdown"
import { getEmailTemplates, type EmailTemplateRecord } from "@/lib/email-templates-store"
import { withMessageImage } from "@/components/dashboard/email/email-preview"
import type { EmailMessageKind } from "@/components/dashboard/email/types"

type Notice = { tone: "success" | "error"; text: string } | null

function cleanSenderDisplay(value: string) {
  return value.replace(/(?:&nbsp;|&#(?:x0*a0|160|x0*20|32);)/gi, " ").replace(/[\u00a0\u2007\u202f]/g, " ").replace(/\s+/g, " ").trim()
}

function recipientEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase() || value.trim().toLowerCase()
}

function htmlToText(value: string) {
  if (!value.includes("<")) return value
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function datetimeLocalMin() {
  const soon = new Date(Date.now() + 5 * 60_000)
  soon.setSeconds(0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`
}

export function QuickEmailComposer({
  open,
  onOpenChange,
  email = "",
  name,
  companyName,
  initialSubject = "",
  initialBody,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Who it goes to. Empty lets the sender type the addresses. */
  email?: string
  name?: string
  companyName?: string
  /** What the message starts as each time it opens. HTML or plain text; plain text becomes paragraphs. */
  initialSubject?: string
  initialBody?: string
}) {
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const firstName = name?.trim().split(/\s+/)[0] || "there"
  const startingBody = initialBody
    ? (initialBody.includes("<") ? initialBody : plainTextToEditorHtml(initialBody))
    : plainTextToEditorHtml(`Hi ${firstName},\n\n`)
  const [composeMinimized, setComposeMinimized] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [senderConfigured, setSenderConfigured] = useState(false)
  const [senderAddress, setSenderAddress] = useState("")
  const [senderOptions, setSenderOptions] = useState<string[]>([])
  const [brandedEmail, setBrandedEmail] = useState(true)
  const [messageKind, setMessageKind] = useState<EmailMessageKind>("transactional")
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [contactQuery, setContactQuery] = useState("")
  const [to, setTo] = useState(email)
  const [cc, setCc] = useState("")
  const [selectedListId, setSelectedListId] = useState("")
  const [body, setBody] = useState(startingBody)
  const [attachments, setAttachments] = useState<File[]>([])
  const [preparingAttachments, setPreparingAttachments] = useState(false)
  const [sending, setSending] = useState(false)
  // The same templates the Email page offers.
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState("")
  const [composerPreviewOpen, setComposerPreviewOpen] = useState(false)
  const [sendNotice, setSendNotice] = useState<Notice>(null)

  useHideMobileFooter(open)

  // Each opening starts from what the caller passed, not from the last message.
  useEffect(() => {
    if (!open) return
    setTo(email)
    setSubject(initialSubject)
    setBody(startingBody)
    setSendNotice(null)
    // Only on opening; the props are the starting point, not live values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // An admin "viewing as" a client sees only that client's templates, as on the Email page.
  const showAllTemplates = isAdmin && !isImpersonating
  const workspaceId = appUser?.companyId || user?.uid || "workspace"
  useEffect(() => {
    if (!user?.uid) return
    let active = true
    getEmailTemplates(workspaceId, showAllTemplates)
      .then((rows) => { if (active) setTemplates(rows) })
      .catch(() => { if (active) setTemplates([]) })
    return () => { active = false }
  }, [showAllTemplates, user?.uid, workspaceId])

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    setSubject(template.subject)
    // Fill the lead's name into the greeting, like the Email page does.
    const html = withMessageImage(template.body, template.imageUrl, template.imageAlt)
    const leadName = name?.trim()
    setBody(leadName
      ? html.replace(/\[Customer Name\]|\[Name\]/gi, leadName).replace(/(^|>|\n)(\s*(?:Dear|Hello)\s+)(Customer)(\s*,?)/i, `$1$2${leadName}$4`)
      : html)
    setSendNotice(null)
  }

  useEffect(() => {
    let active = true
    fetch("/api/email/send", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { configured?: boolean; from?: string | null; senders?: string[] }
        if (!active) return
        setSenderConfigured(Boolean(result.configured))
        setSenderAddress(result.from || "")
        setSenderOptions(Array.isArray(result.senders) ? result.senders : result.from ? [result.from] : [])
      })
      .catch(() => { if (active) setSenderConfigured(false) })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    void user.getIdToken()
      .then((idToken) => fetch("/api/email/google/status", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" }))
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as { configured?: boolean; email?: string | null; senders?: Array<{ display?: string; email?: string }> }
        if (!active || !result.configured) return
        const senders = (result.senders ?? []).map((sender) => sender.display || sender.email || "").filter(Boolean)
        setSenderConfigured(true)
        setSenderAddress(senders[0] || result.email || "")
        setSenderOptions((current) => Array.from(new Set([...current, ...senders])))
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [user])

  function close() {
    setComposerPreviewOpen(false)
    setComposeMinimized(false)
    onOpenChange(false)
  }

  function clearComposer() {
    setSubject("")
    setTo("")
    setCc("")
    setSelectedListId("")
    setBody("")
    setAttachments([])
    setMessageKind("transactional")
    setScheduleEnabled(false)
    setScheduleAt("")
    setSendNotice(null)
  }

  async function addAttachments(files: File[]) {
    if (!files.length) return
    if (attachments.length + files.length > MAX_EMAIL_ATTACHMENTS) {
      setSendNotice({ tone: "error", text: `Attach up to ${MAX_EMAIL_ATTACHMENTS} files.` })
      return
    }
    setPreparingAttachments(true)
    setSendNotice(null)
    try {
      const prepared = await Promise.all(files.map(prepareEmailAttachment))
      const next = [...attachments, ...prepared]
      if (next.reduce((total, file) => total + file.size, 0) > MAX_EMAIL_ATTACHMENT_BYTES) {
        setSendNotice({ tone: "error", text: `Attachments can total up to ${MAX_EMAIL_ATTACHMENT_MEGABYTES} MB.` })
        return
      }
      setAttachments(next)
    } catch (error) {
      setSendNotice({ tone: "error", text: error instanceof Error ? error.message : "The attachment could not be prepared." })
    } finally {
      setPreparingAttachments(false)
    }
  }

  async function sendEmail() {
    if (!user || sending || preparingAttachments || !senderConfigured || !senderAddress.trim()) return
    const trimmedSubject = subject.trim()
    const target = to.trim()
    if (!target || !trimmedSubject || !htmlToText(body).trim()) return
    const ccList = parseEmailList(messageKind === "transactional" ? cc : "")
    if (ccList.invalid.length) {
      setSendNotice({ tone: "error", text: `Check the Cc addresses: ${ccList.invalid.join(", ")}` })
      return
    }

    let scheduledAt = ""
    if (scheduleEnabled) {
      const when = new Date(scheduleAt)
      if (!scheduleAt || Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
        setSendNotice({ tone: "error", text: "Pick a scheduled time at least a minute from now." })
        return
      }
      scheduledAt = when.toISOString()
    }

    setSending(true)
    setSendNotice(null)
    let uploaded: StoredEmailAttachment[] = []
    try {
      uploaded = await uploadEmailAttachments(attachments, user.uid)
      const text = htmlToText(body).trim()
      const html = body.includes("<") ? body : markdownToHtml(body)
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: target,
          cc: ccList.valid.length ? ccList.valid : undefined,
          type: messageKind,
          subject: trimmedSubject,
          text,
          html,
          branded: brandedEmail,
          from: senderAddress,
          scheduledAt: scheduledAt || undefined,
          attachments: uploaded,
          history: {
            to: target,
            createdAt: new Date().toISOString(),
            recipients: [{ email: recipientEmail(target), name: name?.trim() || undefined }],
            companyName: companyName?.trim() || undefined,
          },
        }),
      })
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string }
      if (!response.ok || !result.id) throw new Error(result.error || "The message could not be sent.")
      toast.success(scheduledAt ? "Email scheduled." : "Email sent.")
      close()
    } catch (error) {
      if (uploaded.length) await removeUploadedEmailAttachments(uploaded)
      setSendNotice({ tone: "error", text: error instanceof Error ? error.message : "The message could not be sent. Try again." })
    } finally {
      setSending(false)
    }
  }

  function composerPreviewHtml() {
    const content = body.includes("<") ? body : markdownToHtml(body)
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:32px;color:#20232d;font:15px/1.65 Arial,sans-serif}h1{font-size:24px;line-height:1.25}a{color:#1649d8}</style></head><body><h1>${escapeHtml(subject || "(No subject)")}</h1>${content}</body></html>`
  }

  return (
    <EmailComposer
      composeOpen={open}
      fullPage={false}
      composeMinimized={composeMinimized}
      setComposeMinimized={setComposeMinimized}
      closeCompose={close}
      subject={subject}
      setSubject={setSubject}
      senderAddress={senderAddress}
      senderOptions={senderOptions}
      setSenderAddress={setSenderAddress}
      brandedEmail={brandedEmail}
      setBrandedEmail={setBrandedEmail}
      showOpsDetail
      cleanSenderDisplay={cleanSenderDisplay}
      messageKind={messageKind}
      setMessageKind={setMessageKind}
      contactPickerOpen={contactPickerOpen}
      setContactPickerOpen={setContactPickerOpen}
      setContactQuery={setContactQuery}
      contactQuery={contactQuery}
      selectedList={null}
      handleRecipientChange={setTo}
      contacts={[]}
      visibleContactOptions={[]}
      contactInitials={(contactName, contactEmail) => (contactName || contactEmail).slice(0, 2).toUpperCase()}
      contactAvatarTone={() => "bg-muted text-foreground"}
      to={to}
      cc={cc}
      setCc={setCc}
      recipientEmail={recipientEmail}
      selectedListId={selectedListId}
      setSelectedListId={setSelectedListId}
      setTo={setTo}
      lists={[]}
      body={body}
      setBody={setBody}
      attachments={attachments}
      addAttachments={addAttachments}
      removeAttachment={(index) => setAttachments((current) => current.filter((_, position) => position !== index))}
      preparingAttachments={preparingAttachments}
      senderConfigured={senderConfigured}
      sending={sending}
      scheduleEnabled={scheduleEnabled}
      setScheduleEnabled={setScheduleEnabled}
      scheduleAt={scheduleAt}
      scheduleMin={datetimeLocalMin()}
      setScheduleAt={setScheduleAt}
      sendEmail={() => void sendEmail()}
      draftStatus="idle"
      savingDraft={false}
      setComposerPreviewOpen={setComposerPreviewOpen}
      templates={templates}
      selectedTemplate={selectedTemplate}
      applyTemplate={applyTemplate}
      editingDraftId={null}
      removeDraft={() => undefined}
      clearComposer={clearComposer}
      htmlToText={htmlToText}
      composerPreviewOpen={composerPreviewOpen}
      composerPreviewHtml={composerPreviewHtml}
      sendNotice={sendNotice}
    />
  )
}
