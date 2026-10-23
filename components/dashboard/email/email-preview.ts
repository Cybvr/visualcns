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

/** Plain text of an HTML body. &amp; is decoded last so "&amp;lt;" stays "&lt;". */
export function htmlToText(value: string) {
  if (!value.includes("<")) return value
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
}

/** The bare address from "Name <a@b.com>" or "a@b.com", lowercased. */
export function recipientEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase() || value.trim().toLowerCase()
}

export function cleanSenderDisplay(value: string) {
  return value
    .replace(/(?:&nbsp;|&#(?:x0*a0|160|x0*20|32);)/gi, " ")
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function contactInitials(name: string, email: string) {
  const source = name.trim() || email.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0, 2)).toUpperCase()
}

export function contactAvatarTone(value: string) {
  const tones = [
    "bg-cyan-200 text-cyan-950",
    "bg-sky-200 text-sky-950",
    "bg-rose-200 text-rose-950",
    "bg-slate-300 text-slate-900",
    "bg-amber-200 text-amber-950",
  ]
  const index = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % tones.length
  return tones[index]
}

/** Fills the recipient's name into "[Name]" and a "Dear Customer" or "Hello Customer" greeting. */
export function personalizeGreeting(value: string, name?: string) {
  const trimmedName = name?.trim()
  if (!trimmedName) return value
  return value
    .replace(/\[Customer Name\]|\[Name\]/gi, trimmedName)
    .replace(/(^|>|\n)(\s*(?:Dear|Hello)\s+)(Customer)(\s*,?)/i, `$1$2${trimmedName}$4`)
}

/** The email as it will arrive, for the composer and template previews. */
export function composedEmailPreview({ subject, body, branded, brand, ctaText, ctaUrl }: {
  subject: string
  body: string
  branded: boolean
  brand?: { name?: string; logoUrl?: string; address?: string; website?: string } | null
  ctaText?: string
  ctaUrl?: string
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const content = formatTemplateBody(body || "<p>Your message preview will appear here.</p>")
    .replace(/(src=["'])\/([^"']*)/gi, `$1${origin}/$2`)
  if (!branded) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:36px;background:#fff;color:#20232d;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65}p{margin:0 0 1em}a{color:#1649d8}</style></head><body>${content}</body></html>`
  }
  const logoUrl = brand?.logoUrl || "/visualcns-email-logo.png"
  const absoluteLogoUrl = logoUrl.startsWith("/") ? `${origin}${logoUrl}` : logoUrl
  const brandName = brand?.name || "VisualCNS"
  const address = brand?.address || "Lagos, Nigeria"
  const website = brand?.website || "visualcns.com"
  const websiteUrl = website.startsWith("http") ? website : `https://${website}`
  const buttonUrl = ctaUrl || `${origin}/`
  const buttonText = ctaText || "Open your company page"
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{margin:0;padding:0;background:#f3f4f7;color:#20232d;font-family:Arial,Helvetica,sans-serif}table{border-collapse:collapse}img{display:block;max-width:100%;height:auto;max-height:56px;object-fit:contain;object-position:left center}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body><table role="presentation" width="100%" style="width:100%;background:#f3f4f7"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" style="width:100%;max-width:600px;background:#fff"><tr><td style="padding:22px 28px;height:56px;line-height:0"><img src="${escapeHtmlAttribute(absoluteLogoUrl)}" width="320" alt="${escapeHtmlAttribute(brandName)}" style="display:block;width:320px;max-width:100%;height:auto;max-height:56px;object-fit:contain;object-position:left center;border:0"></td></tr><tr><td style="padding:8px 28px 12px;font-size:15px;line-height:1.65;overflow-wrap:anywhere"><h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#20232d">${escapeHtml(subject || "(No subject)")}</h1>${content}</td></tr><tr><td style="padding:0 28px 30px"><a href="${escapeHtmlAttribute(buttonUrl)}" style="display:inline-block;background:#111318;border-radius:999px;color:#fff;padding:12px 20px;font-size:14px;font-weight:700;line-height:20px;text-decoration:none">${escapeHtml(buttonText)}</a></td></tr><tr><td style="padding:20px 28px;background:#f8f8fa;border-top:1px solid #e7e8ec;font-size:12px;line-height:1.6;color:#6d7280"><strong style="color:#303440">${escapeHtml(brandName)}</strong><br>${escapeHtml(address)}<br><a href="${escapeHtmlAttribute(websiteUrl)}" style="color:#5f6472">${escapeHtml(website)}</a></td></tr></table></td></tr></table></body></html>`
}
