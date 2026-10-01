"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EMAIL_NOTIFICATION_PREFERENCE_EVENT } from "@/components/dashboard/email/use-unread-email-count"

type AlertStatus = "off" | "on" | "blocked" | "unavailable"

export function EmailNotificationControl({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<AlertStatus>("off")
  const storageKey = `visualcns-email-notifications:${workspaceId}`

  useEffect(() => {
    function sync() {
      if (!window.isSecureContext || !("Notification" in window)) {
        setStatus("unavailable")
      } else if (Notification.permission === "denied") {
        setStatus("blocked")
      } else {
        try {
          setStatus(Notification.permission === "granted" && localStorage.getItem(storageKey) === "enabled" ? "on" : "off")
        } catch {
          setStatus("unavailable")
        }
      }
    }
    sync()
    window.addEventListener("focus", sync)
    window.addEventListener("storage", sync)
    window.addEventListener(EMAIL_NOTIFICATION_PREFERENCE_EVENT, sync)
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("storage", sync)
      window.removeEventListener(EMAIL_NOTIFICATION_PREFERENCE_EVENT, sync)
    }
  }, [storageKey])

  async function toggle() {
    if (status === "on") {
      localStorage.removeItem(storageKey)
      setStatus("off")
      window.dispatchEvent(new Event(EMAIL_NOTIFICATION_PREFERENCE_EVENT))
      return
    }
    if (status !== "off") return
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
    if (permission === "granted") {
      localStorage.setItem(storageKey, "enabled")
      setStatus("on")
      window.dispatchEvent(new Event(EMAIL_NOTIFICATION_PREFERENCE_EVENT))
    } else {
      setStatus(permission === "denied" ? "blocked" : "off")
    }
  }

  const label = status === "on" ? "Email alerts on" : status === "blocked" ? "Email alerts blocked" : status === "unavailable" ? "Email alerts unavailable" : "Enable email alerts"
  const help = status === "blocked" ? "Allow notifications in your browser's site settings." : status === "unavailable" ? "Browser alerts need a supported browser and a secure connection." : "Notify me about new inbox emails while VisualCNS is open."

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void toggle()} disabled={status === "blocked" || status === "unavailable"} aria-pressed={status === "on"} aria-label={label} title={help} className="gap-2 max-sm:size-9 max-sm:border-transparent max-sm:bg-transparent max-sm:px-0 max-sm:shadow-none">
      {status === "on" ? <Bell className="size-4" aria-hidden="true" /> : <BellOff className="size-4" aria-hidden="true" />}
      <span className="max-sm:hidden">{label}</span>
    </Button>
  )
}
