"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { getHiddenReceivedIds } from "@/lib/email-received-hidden"

export const UNREAD_EMAIL_COUNT_EVENT = "visualcns-email-unread-count"

export function publishUnreadEmailCount(workspaceId: string, count: number) {
  window.dispatchEvent(new CustomEvent(UNREAD_EMAIL_COUNT_EVENT, { detail: { workspaceId, count } }))
}

export function useUnreadEmailCount() {
  const { user, appUser, isAdmin } = useAuth()
  const workspaceId = appUser?.companyId || user?.uid || ""
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user || !isAdmin || !workspaceId) {
      setCount(0)
      return
    }

    setCount(0)
    const currentUser = user
    let active = true
    let requestId = 0
    const readStorageKey = `visualcns-email-received-read:${workspaceId}`

    async function refresh() {
      const currentRequest = ++requestId
      try {
        const idToken = await currentUser.getIdToken()
        const [response, hiddenIds] = await Promise.all([
          fetch("/api/email/received", {
            headers: { Authorization: `Bearer ${idToken}` },
            cache: "no-store",
          }),
          getHiddenReceivedIds(workspaceId).catch(() => [] as string[]),
        ])
        if (!response.ok) return
        const result = (await response.json()) as { data?: Array<{ id: string }> }
        const messages = Array.isArray(result.data) ? result.data : []
        let readIds: string[] = []
        try {
          const stored = JSON.parse(localStorage.getItem(readStorageKey) || "[]")
          if (Array.isArray(stored)) readIds = stored.filter((id): id is string => typeof id === "string")
        } catch { /* Treat an invalid saved value as no messages read. */ }
        const read = new Set(readIds)
        const hidden = new Set(hiddenIds)
        if (active && currentRequest === requestId) {
          setCount(messages.filter((message) => !hidden.has(message.id) && !read.has(message.id)).length)
        }
      } catch { /* Keep the last known count when the inbox is unavailable. */ }
    }

    function onCountChanged(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: string; count: number }>).detail
      if (detail?.workspaceId !== workspaceId) return
      ++requestId
      setCount(detail.count)
    }

    function onStorage(event: StorageEvent) {
      if (event.key === readStorageKey) void refresh()
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void refresh()
    }

    void refresh()
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, 60_000)
    window.addEventListener(UNREAD_EMAIL_COUNT_EVENT, onCountChanged)
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      active = false
      ++requestId
      window.clearInterval(interval)
      window.removeEventListener(UNREAD_EMAIL_COUNT_EVENT, onCountChanged)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [user, isAdmin, workspaceId])

  return count
}
