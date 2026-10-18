"use client"

import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import type { SocialAccountsInfo } from "@/lib/social"

/** Calls /api/social/* as the signed-in person. Throws with the server's message. */
export function useSocialRequest() {
  const { user } = useAuth()
  return useCallback(async <T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch(`/api/social/${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.")
    return data as T
  }, [user])
}

/** A company's connected social accounts, and who may post. Null while loading or when the viewer can't see them. */
export function useSocialAccounts(companyId: string, enabled = true) {
  const request = useSocialRequest()
  const [info, setInfo] = useState<SocialAccountsInfo | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(enabled)

  const reload = useCallback(async () => {
    if (!enabled || !companyId) return
    setLoading(true)
    try {
      setInfo(await request<SocialAccountsInfo>(`accounts?companyId=${encodeURIComponent(companyId)}`))
      setError("")
    } catch (caught) {
      setInfo(null)
      setError(caught instanceof Error ? caught.message : "Couldn't load social accounts.")
    } finally {
      setLoading(false)
    }
  }, [companyId, enabled, request])

  useEffect(() => { void reload() }, [reload])

  return { info, error, loading, reload, request }
}
