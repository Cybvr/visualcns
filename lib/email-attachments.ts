export const MAX_EMAIL_ATTACHMENTS = 5
export const MAX_EMAIL_ATTACHMENT_BYTES = 5 * 1024 * 1024

export type EmailAttachment = {
  filename: string
  contentType: string
  content: string
}

export type EmailAttachmentInfo = { filename: string; size: number }

export function readEmailAttachment(file: File): Promise<EmailAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error(`Could not read ${file.name}.`))
        return
      }
      resolve({ filename: file.name, contentType: file.type || "application/octet-stream", content: result.slice(result.indexOf(",") + 1) })
    }
    reader.readAsDataURL(file)
  })
}
