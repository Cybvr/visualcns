import type { EmailTemplateRecord } from "@/lib/email-templates-store"
import type { EmailContactList } from "@/lib/email-lists"
import type { EmailMessageRecord, EmailRecipient } from "@/lib/email-messages"

export type EmailTab = "inbox" | "drafts" | "templates" | "messages" | "lists"
export type EmailMessageKind = "transactional" | "marketing"

export type EmailTemplate = Omit<EmailTemplateRecord, "companyId" | "createdBy">
export type SentMessage = Omit<EmailMessageRecord, "companyId" | "createdBy"> & { companyId?: string }
export type ContactList = Omit<EmailContactList, "companyId" | "createdBy">

export type ReceivedMessage = {
  id: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  createdAt: string | null
  messageId?: string | null
  html?: string | null
  text?: string | null
  headers?: Record<string, string> | null
  attachments?: Array<Record<string, unknown>>
}

export type EmailContact = {
  email: string
  label: string
  name: string
  companyId?: string
}

export type EmailRecipientRecord = EmailRecipient
