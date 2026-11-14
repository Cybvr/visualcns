/**
 * Ngai app builder (separate app, deployed at sites.visualcns.com).
 * Change this one constant when the builder moves (e.g. to visualcns.com/ngai via multi-zones).
 */
export const NGAI_APP_URL = "https://sites.visualcns.com/dashboard"

/** Builder origin without the /dashboard path, for chat links. */
export const NGAI_APP_ORIGIN = NGAI_APP_URL.replace(/\/dashboard\/?$/, "")

/** Builder start URL, optionally carrying the visitor's prompt (the builder may not read it yet). */
export function ngaiStartUrl(prompt?: string) {
  const text = prompt?.trim()
  return text ? `${NGAI_APP_URL}?prompt=${encodeURIComponent(text)}` : NGAI_APP_URL
}

export function ngaiChatUrl(chatId: string) {
  return `${NGAI_APP_ORIGIN}/chat/${encodeURIComponent(chatId)}`
}

/** Published builder sites live at <slug>.<NGAI_PUBLISH_DOMAIN> (wildcard domain on the builder's Vercel project). */
export const NGAI_PUBLISH_DOMAIN = "sites.visualcns.com"

export function ngaiPublishedUrl(slug: string) {
  return `https://${slug}.${NGAI_PUBLISH_DOMAIN}`
}

export const NGAI_PROJECTS_URL = `${NGAI_APP_ORIGIN}/dashboard/projects`
