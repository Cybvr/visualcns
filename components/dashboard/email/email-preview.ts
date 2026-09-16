import { markdownToHtml } from "@/lib/markdown"
import type { EmailTemplate, ReceivedMessage, SentMessage } from "./types"

export function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

export function formatTemplateBody(value: string) {
  const content = value.includes("<") ? value : markdownToHtml(value)
  return content.replace(/Best regards,\s*VisualCNS Team/gi, "Best regards,<br />VisualCNS Team")
}

export function withMessageImage(value: string, imageUrl?: string, imageAlt?: string) {
  const content = formatTemplateBody(value)
  if (!imageUrl) return content
  const existingImage = content.match(/<img[^>]*>/i)?.[0]
  const withoutImage = existingImage ? content.replace(existingImage, "").replaceAll("<p></p>", "") : content
  const image = `<p><img src="${escapeHtmlAttribute(imageUrl)}" alt="${escapeHtmlAttribute(imageAlt || "Message image")}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;" /></p>`
  return `${image}${withoutImage}`
}

export function sentMessagePreview(message: SentMessage) {
  const content = message.bodyHtml || `<p>${escapeHtml(message.bodyText || "").replaceAll("\n", "<br />")}</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0;padding:24px;color:#20232d;background:#fff;font:15px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body>${content}</body></html>`
}

export function receivedMessagePreview(message: ReceivedMessage) {
  const content = message.html || `<p>${escapeHtml(message.text || "(This message has no text content.)").replaceAll("\n", "<br />")}</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0;padding:24px;color:#20232d;background:#fff;font:15px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body>${content}</body></html>`
}

export function templatePreview(template: EmailTemplate) {
  const content = withMessageImage(template.body, template.imageUrl, template.imageAlt)
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0 auto;max-width:640px;padding:32px 28px;color:#20232d;background:#fff;font:15px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body>${content}</body></html>`
}
