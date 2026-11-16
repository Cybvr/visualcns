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

/**
 * Opens a builder page already signed in as the current VisualCNS user. The
 * one-time token rides in the URL fragment, which browsers never send to a
 * server. Falls back to the plain link, where the builder asks for sign-in.
 */
export async function openInBuilder(path: string, idToken: () => Promise<string | null>, { fallback = true } = {}): Promise<boolean> {
  const target = path.startsWith("/") ? path : `/${path}`
  try {
    const token = await idToken()
    if (token) {
      const response = await fetch("/api/auth/builder-token", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json().catch(() => ({}))
      if (response.ok && typeof data.token === "string") {
        window.location.assign(`${NGAI_APP_ORIGIN}/auth/handoff#token=${encodeURIComponent(data.token)}&next=${encodeURIComponent(target)}`)
        return true
      }
    }
  } catch {
    // Fall through to the plain link.
  }
  // The builder signs people in through VisualCNS, so without a token the plain link would only come back here.
  if (fallback) window.location.assign(`${NGAI_APP_ORIGIN}${target}`)
  return false
}
