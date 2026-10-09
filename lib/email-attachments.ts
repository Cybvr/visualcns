export const MAX_EMAIL_ATTACHMENTS = 5
export const MAX_EMAIL_ATTACHMENT_MEGABYTES = 5
export const MAX_EMAIL_ATTACHMENT_BYTES = MAX_EMAIL_ATTACHMENT_MEGABYTES * 1024 * 1024

export type EmailAttachment = {
  filename: string
  contentType: string
  content: string
}

export type EmailAttachmentInfo = { filename: string; size: number }

export type StoredEmailAttachment = {
  filename: string
  contentType: string
  size: number
  storagePath: string
}
