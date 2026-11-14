/**
 * Ngai app builder (separate app, deployed at juju.visualcns.com).
 * Change this one constant when the builder moves (e.g. to visualcns.com/ngai via multi-zones).
 */
export const NGAI_APP_URL = "https://juju.visualcns.com/dashboard"

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

export const NGAI_PROJECTS_URL = `${NGAI_APP_ORIGIN}/dashboard/projects`
