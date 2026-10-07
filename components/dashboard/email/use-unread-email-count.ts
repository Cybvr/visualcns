"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { getHiddenReceivedIds } from "@/lib/email-received-hidden"

export const UNREAD_EMAIL_COUNT_EVENT = "visualcns-email-unread-count"
export const EMAIL_NOTIFICATION_PREFERENCE_EVENT = "visualcns-email-notification-preference"
export const EMAIL_INBOX_REFRESH_EVENT = "visualcns-email-inbox-refresh"

type InboxMessage = { id: string; from: string; subject: string }

async function showNewEmailNotifications(messages: InboxMessage[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") return
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready
      for (const message of messages) {
        await registration.showNotification(message.from || "New email", {
          body: message.subject || "(No subject)",
          icon: "/visualhqlogo.svg",
          badge: "/visualhqlogo.svg",
          tag: `visualcns-email:${message.id}`,
          data: { url: "/dashboard/email" },
        })
      }
    } else {
      for (const message of messages) {
        const notification = new Notification(message.from || "New email", {
          body: message.subject || "(No subject)",
          icon: "/visualhqlogo.svg",
          tag: `visualcns-email:${message.id}`,
        })
        notification.onclick = () => {
          window.focus()
          window.location.assign("/dashboard/email")
          notification.close()
        }
      }
    }
  } catch { /* A browser can revoke permission or suspend its service worker. */ }
}

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
    const seenStorageKey = `visualcns-email-received-seen:${workspaceId}`
    const preferenceStorageKey = `visualcns-email-notifications:${workspaceId}`

    async function refresh(suppressNotifications = false) {
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
        const result = (await response.json()) as { data?: InboxMessage[]; partial?: boolean }
        if (result.partial) return
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
          window.dispatchEvent(new CustomEvent(EMAIL_INBOX_REFRESH_EVENT, { detail: { workspaceId, messages } }))
          try {
            const stored = localStorage.getItem(seenStorageKey)
            const parsed = stored ? JSON.parse(stored) : []
            const seen = new Set<string>(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [])
            const newlyReceived = stored !== null && !suppressNotifications && localStorage.getItem(preferenceStorageKey) === "enabled"
              ? messages.filter((message) => !seen.has(message.id) && !hidden.has(message.id) && !read.has(message.id))
              : []
            localStorage.setItem(seenStorageKey, JSON.stringify([...new Set([...messages.map((message) => message.id), ...seen])].slice(0, 300)))
            if (newlyReceived.length > 0) {
              const alerts = newlyReceived.length > 3
                ? [{ id: newlyReceived[0].id, from: "New inbox mail", subject: `${newlyReceived.length} new emails` }]
                : newlyReceived
              void showNewEmailNotifications(alerts)
            }
          } catch { /* Counting still works if browser storage is unavailable. */ }
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
      try {
        if (document.visibilityState === "visible" || localStorage.getItem(preferenceStorageKey) === "enabled") void refresh()
      } catch {
        if (document.visibilityState === "visible") void refresh()
      }
    }, 60_000)
    const onFocus = () => { void refresh() }
    const onPreferenceChanged = () => { void refresh(true) }
    window.addEventListener(UNREAD_EMAIL_COUNT_EVENT, onCountChanged)
    window.addEventListener(EMAIL_NOTIFICATION_PREFERENCE_EVENT, onPreferenceChanged)
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      active = false
      ++requestId
      window.clearInterval(interval)
      window.removeEventListener(UNREAD_EMAIL_COUNT_EVENT, onCountChanged)
      window.removeEventListener(EMAIL_NOTIFICATION_PREFERENCE_EVENT, onPreferenceChanged)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [user, isAdmin, workspaceId])

  return count
}
