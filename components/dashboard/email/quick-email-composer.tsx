"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { EmailComposer } from "@/components/dashboard/email/email-composer"
import { useHideMobileFooter } from "@/components/dashboard/page-title-context"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { MAX_EMAIL_ATTACHMENTS, MAX_EMAIL_ATTACHMENT_BYTES, MAX_EMAIL_ATTACHMENT_MEGABYTES, type StoredEmailAttachment } from "@/lib/email-attachments"
import { prepareEmailAttachment, removeUploadedEmailAttachments, uploadEmailAttachments } from "@/lib/email-attachment-uploads"
import { parseEmailList, plainTextToEditorHtml, type EmailComposeContext } from "@/lib/email-composer"
import { deleteEmailDraft, saveEmailDraft, setEmailDraftTrashed, type EmailDraftRecord } from "@/lib/email-drafts"
import { markdownToHtml } from "@/lib/markdown"
import { getEmailLists } from "@/lib/email-lists"
import type { EmailRecipient } from "@/lib/email-messages"
import { getEmailTemplates, type EmailTemplateRecord } from "@/lib/email-templates-store"
import { createUser, getUsers } from "@/lib/users"
import {
  cleanSenderDisplay,
  composedEmailPreview,
  contactAvatarTone,
  contactInitials,
  htmlToText,
  personalizeGreeting,
  recipientEmail,
  withMessageImage,
} from "@/components/dashboard/email/email-preview"
import type { ContactList, EmailContact, EmailMessageKind, SentMessage } from "@/components/dashboard/email/types"

type Notice = { tone: "success" | "error"; text: string } | null

export type EmailThreading = {
  threadId?: string
  inReplyTo?: string
  references?: string[]
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The message as words and addresses only, so "a@b.com" and the "a@b.com, " its badge leaves behind compare the same. */
function draftKey(to: string, cc: string, listId: string, subject: string, body: string) {
  const addresses = (value: string) => value.split(/[,;]/).map((item) => item.trim().toLowerCase()).filter(Boolean).join(",")
  return JSON.stringify([addresses(to), addresses(cc), listId, subject.trim(), htmlToText(body).trim()])
}

function datetimeLocalMin() {
  const soon = new Date(Date.now() + 5 * 60_000)
  soon.setSeconds(0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

/** The one email composer, used by the Email page and anywhere else that sends an email. Mount it when it opens. */
export function QuickEmailComposer({
  open,
  onOpenChange,
  email = "",
  name,
  companyName,
  initialSubject = "",
  initialBody,
  initialCc = "",
  initialMessageKind = "transactional",
  context,
  threading,
  draft,
  templateId,
  onSent,
  onDraftSaved,
  onDraftTrashed,
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
  initialCc?: string
  initialMessageKind?: EmailMessageKind
  /** What the message is about (client, document, button), sent with it and kept on its draft. */
  context?: EmailComposeContext
  /** Set when replying, so the reply joins the original thread. */
  threading?: EmailThreading
  /** A saved draft to carry on with; it replaces the starting values above. */
  draft?: EmailDraftRecord
  /** A template to start from. */
  templateId?: string
  onSent?: (message: SentMessage) => void
  onDraftSaved?: (draft: EmailDraftRecord) => void
  onDraftTrashed?: (draft: EmailDraftRecord) => void
}) {
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  // An admin "viewing as" a client sees only what that client sees.
  const showOpsDetail = isAdmin && !isImpersonating
  const workspaceId = appUser?.companyId || user?.uid || "workspace"
  const firstName = name?.trim().split(/\s+/)[0] || "there"
  const startingBody = initialBody
    ? (initialBody.includes("<") ? initialBody : plainTextToEditorHtml(initialBody))
    : plainTextToEditorHtml(email ? `Hi ${firstName},\n\n` : "")
  const [composeMinimized, setComposeMinimized] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [senderConfigured, setSenderConfigured] = useState(false)
  const [senderAddress, setSenderAddress] = useState("")
  const [senderOptions, setSenderOptions] = useState<string[]>([])
  const [brandedEmail, setBrandedEmail] = useState(true)
  const [messageKind, setMessageKind] = useState<EmailMessageKind>(initialMessageKind)
  const [composeContext, setComposeContext] = useState<EmailComposeContext | null>(context ?? null)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  // The same contacts and lists the Email page offers, suggested as you type in To.
  const [contacts, setContacts] = useState<EmailContact[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [to, setTo] = useState(email)
  const [cc, setCc] = useState(initialCc)
  const [selectedListId, setSelectedListId] = useState("")
  const [body, setBody] = useState(startingBody)
  const [attachments, setAttachments] = useState<File[]>([])
  const [preparingAttachments, setPreparingAttachments] = useState(false)
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState("")
  const [composerPreviewOpen, setComposerPreviewOpen] = useState(false)
  const [sendNotice, setSendNotice] = useState<Notice>(null)
  // Drafts go to the same Drafts as the Email page, saved shortly after typing stops.
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [savingDraft, setSavingDraft] = useState(false)
  const draftIdRef = useRef<string | null>(null)
  const draftCompanyRef = useRef(workspaceId)
  // Edits made while a save is running are saved straight after it, with the latest values.
  const savingDraftRef = useRef(false)
  const saveAgainRef = useRef(false)
  const saveDraftRef = useRef<() => Promise<void>>(async () => undefined)
  // What it opened with, so a message nobody has touched isn't saved as a draft.
  const startingRef = useRef("")
  const pendingTemplateRef = useRef(templateId || "")

  useHideMobileFooter(open)

  // A greeting is only personalised when the message goes to one person.
  const toEmails = to.split(/[,;]/).map((value) => value.trim()).filter(Boolean)
  const recipientName = (toEmails.length === 1 ? contacts.find((contact) => contact.email === recipientEmail(toEmails[0]))?.name : undefined)
    || name?.trim()
    || composeContext?.recipientName

  // Each opening starts from what the caller passed, not from the last message.
  useEffect(() => {
    if (!open) return
    const start = draft
      ? { to: draft.to || "", cc: draft.cc || "", listId: draft.listId || "", subject: draft.subject || "", body: draft.body || "" }
      : { to: email, cc: initialCc, listId: "", subject: initialSubject, body: startingBody }
    setTo(start.to)
    setCc(start.cc)
    setSelectedListId(start.listId)
    setSubject(start.subject)
    setBody(start.body)
    if (draft) {
      setMessageKind(draft.messageKind === "marketing" ? "marketing" : "transactional")
      setBrandedEmail(draft.brandedEmail !== false)
      setComposeContext((draft.context as EmailComposeContext | null) ?? (draft.companyId !== workspaceId ? { companyId: draft.companyId } : null))
    }
    setSendNotice(null)
    setDraftId(draft?.id ?? null)
    setDraftStatus(draft ? "saved" : "idle")
    draftIdRef.current = draft?.id ?? null
    draftCompanyRef.current = draft?.companyId || workspaceId
    startingRef.current = draftKey(start.to, start.cc, start.listId, start.subject, start.body)
    // Only on opening; the props are the starting point, not live values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!user?.uid) return
    let active = true
    getEmailTemplates(workspaceId, showOpsDetail)
      .then((rows) => { if (active) setTemplates(rows) })
      .catch(() => { if (active) setTemplates([]) })
    return () => { active = false }
  }, [showOpsDetail, user?.uid, workspaceId])

  // A template asked for on opening is applied once the templates have loaded.
  useEffect(() => {
    if (!pendingTemplateRef.current || !templates.some((template) => template.id === pendingTemplateRef.current)) return
    applyTemplate(pendingTemplateRef.current)
    pendingTemplateRef.current = ""
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates])

  useEffect(() => {
    if (!open || !user?.uid) return
    let active = true
    getEmailLists(workspaceId, showOpsDetail)
      .then((rows) => { if (active) setLists(rows) })
      .catch(() => { if (active) setLists([]) })
    // Agency people only: a client's view doesn't list everyone.
    if (showOpsDetail) {
      getUsers()
        .then((users) => {
          if (!active) return
          const seen = new Set<string>()
          setContacts(users
            .filter((person) => person.email?.trim())
            .map((person) => ({
              email: person.email.trim().toLowerCase(),
              label: [person.company, person.displayName].filter(Boolean).join(" · ") || person.email.trim(),
              name: person.displayName?.trim() || person.company?.trim() || person.email.trim().split("@")[0],
              companyId: person.companyId || person.uid,
            }))
            .filter((contact) => {
              if (seen.has(contact.email)) return false
              seen.add(contact.email)
              return true
            }))
        })
        .catch(() => { if (active) setContacts([]) })
    }
    return () => { active = false }
  }, [open, showOpsDetail, user?.uid, workspaceId])

  useEffect(() => {
    let active = true
    void getBusinessProfile().then((profile) => { if (active) setBusinessProfile(profile) })
    return () => { active = false }
  }, [])

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null

  async function saveDraft() {
    if (!user) return
    if (savingDraftRef.current) {
      saveAgainRef.current = true
      return
    }
    // Sent or cleared while the last save ran: nothing left to keep.
    if (!subject.trim() && !htmlToText(body).trim() && !to.trim() && !selectedListId) return
    savingDraftRef.current = true
    setSavingDraft(true)
    setDraftStatus("saving")
    const id = draftIdRef.current || crypto.randomUUID()
    draftIdRef.current = id
    const record: EmailDraftRecord = {
      id,
      companyId: draftCompanyRef.current,
      createdBy: user.uid,
      to: to.trim() || undefined,
      cc: cc.trim() || undefined,
      listId: selectedListId || undefined,
      subject: subject.trim() || undefined,
      body: body || undefined,
      messageKind,
      brandedEmail,
      context: composeContext ? { ...composeContext } : null,
      updatedAt: new Date().toISOString(),
    }
    try {
      await saveEmailDraft(record)
      setDraftId(id)
      setDraftStatus("saved")
      onDraftSaved?.(record)
    } catch {
      setDraftStatus("error")
    } finally {
      savingDraftRef.current = false
      setSavingDraft(false)
      if (saveAgainRef.current) {
        saveAgainRef.current = false
        void saveDraftRef.current()
      }
    }
  }
  saveDraftRef.current = saveDraft

  useEffect(() => {
    if (!open || !user?.uid) return
    const empty = !subject.trim() && !htmlToText(body).trim() && !to.trim() && !selectedListId
    const untouched = draftKey(to, cc, selectedListId, subject, body) === startingRef.current
    if (empty || untouched) {
      if (!draftIdRef.current) setDraftStatus("idle")
      return
    }
    setDraftStatus("saving")
    const timer = window.setTimeout(() => { void saveDraft() }, 800)
    return () => window.clearTimeout(timer)
    // saveDraft reads the latest values when the timer fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, brandedEmail, cc, messageKind, open, selectedListId, subject, to, user?.uid])

  async function removeDraft(id: string) {
    const trashedAt = new Date().toISOString()
    try {
      await setEmailDraftTrashed(id, trashedAt)
    } catch {
      setSendNotice({ tone: "error", text: "The draft could not be moved to Bin." })
      return
    }
    onDraftTrashed?.({ id, companyId: draftCompanyRef.current, createdBy: user?.uid || "", subject: subject.trim() || undefined, to: to.trim() || undefined, body, updatedAt: trashedAt, trashedAt })
    setDraftId(null)
    draftIdRef.current = null
  }

  function applyTemplate(id: string) {
    setSelectedTemplateId(id)
    const template = templates.find((item) => item.id === id)
    if (!template) return
    setSubject(template.subject)
    setBody(personalizeGreeting(withMessageImage(template.body, template.imageUrl, template.imageAlt), recipientName))
    setSendNotice(null)
  }

  function handleRecipientChange(value: string) {
    setTo(value)
    const contact = contacts.find((item) => item.email === recipientEmail(value))
    if (contact) setBody((current) => personalizeGreeting(current, contact.name))
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
    setComposeContext(null)
    setSelectedTemplateId("")
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
      if (next.some((file) => !file.size)) {
        setSendNotice({ tone: "error", text: "Empty files cannot be attached." })
        return
      }
      if (next.reduce((total, file) => total + file.size, 0) > MAX_EMAIL_ATTACHMENT_BYTES) {
        setSendNotice({ tone: "error", text: `Attachments can total up to ${MAX_EMAIL_ATTACHMENT_MEGABYTES} MB after image optimization.` })
        return
      }
      setAttachments(next)
    } catch (error) {
      setSendNotice({ tone: "error", text: error instanceof Error ? error.message : "The attachment could not be prepared." })
    } finally {
      setPreparingAttachments(false)
    }
  }

  /** Anyone emailed who isn't a contact yet is saved as an agency contact, so they're there next time. */
  async function saveNewContacts(emails: string[]) {
    const known = new Set(contacts.map((contact) => contact.email))
    const fresh = [...new Set(emails.map(recipientEmail))].filter((address) => EMAIL_PATTERN.test(address) && !known.has(address))
    await Promise.all(fresh.map((address) =>
      createUser(crypto.randomUUID(), { email: address, displayName: "", company: "", companyId: "", photoURL: "", role: "client" })
        .catch((error) => console.error("Couldn't save the new contact:", error))))
  }

  async function sendEmail() {
    if (!user || sending || preparingAttachments || !senderConfigured || !senderAddress.trim()) return
    const trimmedSubject = subject.trim()
    // Everyone typed in To, plus a picked list, each once.
    const typedRecipients = to.split(/[,;]/).map((value) => value.trim()).filter(Boolean)
    const recipients = Array.from(new Set([...(selectedList?.contactEmails ?? []), ...typedRecipients].map(recipientEmail)))
    const recipientsLabel = [selectedList ? `${selectedList.name} (${selectedList.contactEmails.length})` : "", ...typedRecipients].filter(Boolean).join(", ")
    if ((selectedListId && !selectedList) || !recipients.length || recipients.some((address) => !EMAIL_PATTERN.test(address))) return
    if (!trimmedSubject || EMAIL_PATTERN.test(trimmedSubject) || recipients.includes(trimmedSubject.toLowerCase())) {
      setSendNotice({ tone: "error", text: "Add a message subject. The recipient's email can't be used as the subject." })
      return
    }
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
      const sentBody = personalizeGreeting(body, recipientName)
      const text = htmlToText(sentBody).trim()
      const html = sentBody.includes("<") ? sentBody : markdownToHtml(sentBody)
      const recipientRecords: EmailRecipient[] = recipients.map((address) => {
        const contact = contacts.find((item) => item.email === address)
        return {
          email: address,
          name: contact?.name || (recipients.length === 1 ? recipientName : undefined),
          companyId: contact?.companyId || composeContext?.companyId,
        }
      })
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          cc: ccList.valid.length ? ccList.valid : undefined,
          intent: composeContext?.intent,
          type: messageKind,
          subject: trimmedSubject,
          text,
          html,
          branded: brandedEmail,
          from: senderAddress,
          brand: businessProfile,
          cta: composeContext?.ctaUrl ? { text: composeContext.ctaText || "Open your company page", url: composeContext.ctaUrl } : undefined,
          companyId: composeContext?.companyId,
          projectId: composeContext?.projectId,
          documentType: composeContext?.documentType,
          documentId: composeContext?.documentId,
          scheduledAt: scheduledAt || undefined,
          attachments: uploaded,
          threading,
          history: {
            companyId: composeContext?.companyId || workspaceId,
            to: recipientsLabel,
            createdAt: new Date().toISOString(),
            recipients: recipientRecords,
            companyName: composeContext?.companyName || companyName?.trim() || undefined,
            projectName: composeContext?.projectName,
            documentTitle: composeContext?.documentTitle,
          },
        }),
      })
      const responseText = await response.text()
      let result: { id?: string; html?: string; text?: string; replyTo?: string | null; threadId?: string | null; suppressedCount?: number; cc?: string[]; historySaved?: boolean; error?: string } = {}
      try {
        result = responseText ? JSON.parse(responseText) as typeof result : {}
      } catch {
        result = {
          error: response.status === 413 || /(?:request|payload).{0,20}too large/i.test(responseText)
            ? "This email is too large to send. Remove an attachment and try again."
            : "The email service returned an unreadable response. Try again.",
        }
      }
      if (!response.ok || !result.id) throw new Error(result.error || "The message could not be sent.")

      onSent?.({
        id: result.id,
        providerId: result.id,
        to: recipientsLabel,
        cc: result.cc?.length ? result.cc : undefined,
        subject: trimmedSubject,
        createdAt: new Date().toISOString(),
        from: senderAddress,
        replyTo: result.replyTo || senderAddress,
        threadId: result.threadId || threading?.threadId,
        inReplyTo: threading?.inReplyTo,
        references: threading?.references,
        bodyHtml: result.html || html,
        bodyText: result.text || text,
        recipients: recipientRecords,
        companyName: composeContext?.companyName,
        projectId: composeContext?.projectId,
        projectName: composeContext?.projectName,
        documentType: composeContext?.documentType,
        documentId: composeContext?.documentId,
        documentTitle: composeContext?.documentTitle,
        messageKind,
        status: scheduledAt ? "scheduled" : "sent",
        scheduledAt: scheduledAt || undefined,
        attachments: attachments.map((file) => ({ filename: file.name, size: file.size })),
      })
      if (showOpsDetail) void saveNewContacts([...typedRecipients, ...ccList.valid])
      const verb = scheduledAt ? `Scheduled for ${formatMessageDate(scheduledAt)}` : "Message sent"
      const skipped = result.suppressedCount ? ` ${result.suppressedCount} unsubscribed contact${result.suppressedCount === 1 ? "" : "s"} skipped.` : ""
      if (result.historySaved === false) toast.error(`${verb}, but its history could not be saved.`)
      else toast.success(`${verb}.${skipped}`)
      // Sent, so it's no longer a draft.
      const sentDraftId = draftIdRef.current
      draftIdRef.current = null
      setDraftId(null)
      setDraftStatus("idle")
      if (sentDraftId) void deleteEmailDraft(sentDraftId).catch(() => undefined)
      close()
    } catch (error) {
      if (uploaded.length) await removeUploadedEmailAttachments(uploaded)
      setSendNotice({ tone: "error", text: error instanceof Error ? error.message : "The message could not be sent. Try again." })
    } finally {
      setSending(false)
    }
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
      showOpsDetail={showOpsDetail}
      cleanSenderDisplay={cleanSenderDisplay}
      messageKind={messageKind}
      setMessageKind={setMessageKind}
      selectedList={selectedList}
      handleRecipientChange={handleRecipientChange}
      contacts={contacts}
      contactInitials={contactInitials}
      contactAvatarTone={contactAvatarTone}
      to={to}
      cc={cc}
      setCc={setCc}
      selectedListId={selectedListId}
      setSelectedListId={setSelectedListId}
      lists={lists}
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
      draftStatus={draftStatus}
      savingDraft={savingDraft}
      setComposerPreviewOpen={setComposerPreviewOpen}
      templates={templates}
      selectedTemplate={selectedTemplate}
      applyTemplate={applyTemplate}
      editingDraftId={draftId}
      removeDraft={(id) => void removeDraft(id)}
      clearComposer={clearComposer}
      htmlToText={htmlToText}
      composerPreviewOpen={composerPreviewOpen}
      composerPreviewHtml={() => composedEmailPreview({ subject, body, branded: brandedEmail, brand: businessProfile, ctaText: composeContext?.ctaText, ctaUrl: composeContext?.ctaUrl })}
      sendNotice={sendNotice}
    />
  )
}
